import { query, withTransaction } from '../db';
import { redis } from '../config/redis';
import { Campaign, ScheduledEmail, Sender, EmailJobData } from '../types/db';
import { RecipientParser } from '../utils/recipient.parser';
import { enqueueEmailJob } from '../queue/email.queue';
import { config } from '../config/env';

const IDEMPOTENCY_RESULT_TTL_SECONDS = 24 * 60 * 60;
const IDEMPOTENCY_IN_PROGRESS_TTL_SECONDS = 120;

export interface CreateScheduleInput {
  userId: string;
  senderId?: string | null;
  recipients: string | string[];
  subject: string;
  body: string;
  startAt?: string | Date;
  delayMs?: number;
  hourlyLimit?: number;
  requestId?: string | null;
}

export interface CreateScheduleResult {
  campaignId: string;
  totalRecipients: number;
  acceptedRecipientCount: number;
  scheduledCount: number;
  firstScheduledAt: string;
  lastScheduledAt: string;
  sender: {
    id: string;
    displayName: string;
    email: string;
  };
}

export class ScheduleService {
  /**
   * Resolves active sender for the campaign
   */
  static async resolveSender(senderId?: string | null): Promise<Sender> {
    if (senderId) {
      const res = await query<Sender>(
        'SELECT * FROM senders WHERE id = $1 AND active = TRUE LIMIT 1',
        [senderId]
      );
      if (res.rows.length > 0) {
        return res.rows[0];
      }
    }

    // Fallback to default active sender
    const defaultRes = await query<Sender>(
      'SELECT * FROM senders WHERE active = TRUE ORDER BY is_default DESC, created_at ASC LIMIT 1'
    );

    if (defaultRes.rows.length > 0) {
      return defaultRes.rows[0];
    }

    // If no sender exists in DB yet, create a default one
    const insertRes = await query<Sender>(
      `INSERT INTO senders (display_name, email, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, is_default, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        config.smtp.fromName,
        config.smtp.fromEmail,
        config.smtp.host,
        config.smtp.port,
        config.smtp.user || 'demo@ethereal.email',
        config.smtp.pass || 'demopass',
        false,
        true,
        true,
      ]
    );

    return insertRes.rows[0];
  }

  /**
   * Creates a campaign, persists scheduled emails, and enqueues durable BullMQ delayed jobs
   */
  static async createSchedule(input: CreateScheduleInput): Promise<CreateScheduleResult> {
    const {
      userId,
      senderId,
      recipients,
      subject,
      body,
      startAt = new Date(),
      delayMs = config.worker.defaultDelayMs,
      hourlyLimit = config.worker.defaultHourlyLimit,
      requestId,
    } = input;

    // 0. Idempotency guard: a client-supplied requestId (stable for the lifetime of
    // one compose session) prevents double-click/retry/multi-tab submits from
    // creating duplicate campaigns. Claim the key atomically before doing any work;
    // a duplicate request either gets the cached result back or a clear rejection.
    let idempotencyLockKey: string | null = null;
    if (requestId) {
      idempotencyLockKey = `schedule-idempotency:${userId}:${requestId}`;
      const claimed = await redis.set(
        idempotencyLockKey,
        'IN_PROGRESS',
        'EX',
        IDEMPOTENCY_IN_PROGRESS_TTL_SECONDS,
        'NX'
      );
      if (!claimed) {
        const existing = await redis.get(idempotencyLockKey);
        if (existing && existing !== 'IN_PROGRESS') {
          return JSON.parse(existing) as CreateScheduleResult;
        }
        throw new Error('This campaign is already being scheduled. Please wait a moment and check the Scheduled tab.');
      }
    }

    try {
      return await this.createScheduleInner({
        userId,
        senderId,
        recipients,
        subject,
        body,
        startTimeMs: isNaN(new Date(startAt).getTime()) ? Date.now() : new Date(startAt).getTime(),
        delayMs,
        hourlyLimit,
        idempotencyLockKey,
      });
    } catch (err) {
      if (idempotencyLockKey) {
        await redis.del(idempotencyLockKey).catch(() => {});
      }
      throw err;
    }
  }

  private static async createScheduleInner(input: {
    userId: string;
    senderId?: string | null;
    recipients: string | string[];
    subject: string;
    body: string;
    startTimeMs: number;
    delayMs: number;
    hourlyLimit: number;
    idempotencyLockKey: string | null;
  }): Promise<CreateScheduleResult> {
    const { userId, senderId, recipients, subject, body, startTimeMs, delayMs, hourlyLimit, idempotencyLockKey } =
      input;

    // 1. Parse and validate recipients
    const parsed = RecipientParser.parse(recipients);
    if (parsed.validEmails.length === 0) {
      throw new Error('No valid recipient email addresses found in the provided input.');
    }

    // 2. Resolve sender
    const sender = await this.resolveSender(senderId);

    // 3. Persist Campaign and Scheduled Emails atomically
    const { campaign, emailRecords } = await withTransaction(async (client) => {
      // Insert campaign
      const campRes = await client.query<Campaign>(
        `INSERT INTO campaigns (
           user_id, sender_id, subject, body, start_at, delay_ms, hourly_limit, total_recipients, status
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          userId,
          sender.id,
          subject,
          body,
          new Date(startTimeMs),
          delayMs,
          hourlyLimit,
          parsed.validEmails.length,
          'scheduled',
        ]
      );
      const newCampaign = campRes.rows[0];

      // Insert scheduled emails
      const createdEmails: ScheduledEmail[] = [];
      for (let i = 0; i < parsed.validEmails.length; i++) {
        const recipientEmail = parsed.validEmails[i];
        const scheduledTime = new Date(startTimeMs + i * delayMs);
        const idempotencyKey = `${newCampaign.id}:${recipientEmail}`;

        const emailRes = await client.query<ScheduledEmail>(
          `INSERT INTO scheduled_emails (
             campaign_id, recipient_email, scheduled_at, status, idempotency_key
           ) VALUES ($1, $2, $3, $4, $5)
           RETURNING *`,
          [newCampaign.id, recipientEmail, scheduledTime, 'scheduled', idempotencyKey]
        );

        createdEmails.push(emailRes.rows[0]);
      }

      return { campaign: newCampaign, emailRecords: createdEmails };
    });

    // 4. Enqueue BullMQ delayed jobs. Rows whose enqueue fails here stay durably
    // persisted with bull_job_id = NULL and are picked up by reconcileOrphanedJobs()
    // on the next server boot, so nothing is silently lost - but the response below
    // must still reflect what actually succeeded right now.
    let enqueuedCount = 0;
    for (const record of emailRecords) {
      const scheduledTimeMs = new Date(record.scheduled_at).getTime();
      const delay = Math.max(0, scheduledTimeMs - Date.now());

      const jobData: EmailJobData = {
        scheduledEmailId: record.id,
        campaignId: campaign.id,
        userId,
        senderId: sender.id,
        recipientEmail: record.recipient_email,
        subject: campaign.subject,
        body: campaign.body,
        scheduledAt: record.scheduled_at.toISOString(),
        delayMs,
        hourlyLimit,
        idempotencyKey: record.idempotency_key,
      };

      try {
        const bullJob = await enqueueEmailJob(jobData, delay, record.id);
        await query(
          'UPDATE scheduled_emails SET bull_job_id = $1 WHERE id = $2',
          [bullJob.id || record.id, record.id]
        );
        enqueuedCount++;
      } catch (err: any) {
        console.error(`[Queue Enqueue Warning for Job ${record.id}]:`, err.message);
      }
    }

    const firstScheduledAt = emailRecords[0].scheduled_at.toISOString();
    const lastScheduledAt = emailRecords[emailRecords.length - 1].scheduled_at.toISOString();

    const result: CreateScheduleResult = {
      campaignId: campaign.id,
      totalRecipients: parsed.validEmails.length,
      acceptedRecipientCount: parsed.validEmails.length,
      scheduledCount: enqueuedCount,
      firstScheduledAt,
      lastScheduledAt,
      sender: {
        id: sender.id,
        displayName: sender.display_name,
        email: sender.email,
      },
    };

    if (idempotencyLockKey) {
      await redis.set(idempotencyLockKey, JSON.stringify(result), 'EX', IDEMPOTENCY_RESULT_TTL_SECONDS);
    }

    return result;
  }

  /**
   * Re-enqueues scheduled_emails rows that were committed to Postgres but never
   * got a BullMQ job (enqueue failed, or the process crashed mid-loop after the
   * transaction committed). Safe to call on every boot: idempotent since BullMQ's
   * jobId (= scheduled_emails.id) de-duplicates against any job that did make it in.
   */
  static async reconcileOrphanedJobs(): Promise<number> {
    const orphanedRes = await query<
      ScheduledEmail & { user_id: string; sender_id: string | null; subject: string; body: string }
    >(
      `SELECT se.*, c.user_id, c.sender_id, c.subject, c.body
       FROM scheduled_emails se
       JOIN campaigns c ON se.campaign_id = c.id
       WHERE se.status IN ('scheduled', 'processing') AND se.bull_job_id IS NULL`
    );

    if (orphanedRes.rows.length === 0) {
      return 0;
    }

    console.log(`[Reconciliation] Found ${orphanedRes.rows.length} orphaned scheduled_emails row(s). Re-enqueuing...`);

    let reconciled = 0;
    for (const record of orphanedRes.rows) {
      const scheduledTimeMs = new Date(record.scheduled_at).getTime();
      const delay = Math.max(0, scheduledTimeMs - Date.now());

      const jobData: EmailJobData = {
        scheduledEmailId: record.id,
        campaignId: record.campaign_id,
        userId: record.user_id,
        senderId: record.sender_id,
        recipientEmail: record.recipient_email,
        subject: record.subject,
        body: record.body,
        scheduledAt: record.scheduled_at.toISOString(),
        delayMs: config.worker.defaultDelayMs,
        hourlyLimit: config.worker.defaultHourlyLimit,
        idempotencyKey: record.idempotency_key,
      };

      try {
        const bullJob = await enqueueEmailJob(jobData, delay, record.id);
        await query('UPDATE scheduled_emails SET bull_job_id = $1, status = $2 WHERE id = $3', [
          bullJob.id || record.id,
          'scheduled',
          record.id,
        ]);
        reconciled++;
      } catch (err: any) {
        console.error(`[Reconciliation Warning for Job ${record.id}]:`, err.message);
      }
    }

    console.log(`[Reconciliation] Re-enqueued ${reconciled}/${orphanedRes.rows.length} orphaned job(s).`);
    return reconciled;
  }
}
