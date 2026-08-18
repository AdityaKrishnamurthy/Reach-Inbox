import { query, withTransaction } from '../db';
import { Campaign, ScheduledEmail, Sender, EmailJobData } from '../types/db';
import { RecipientParser } from '../utils/recipient.parser';
import { enqueueEmailJob } from '../queue/email.queue';
import { config } from '../config/env';

export interface CreateScheduleInput {
  userId: string;
  senderId?: string | null;
  recipients: string | string[];
  subject: string;
  body: string;
  startAt?: string | Date;
  delayMs?: number;
  hourlyLimit?: number;
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
    } = input;

    // 1. Parse and validate recipients
    const parsed = RecipientParser.parse(recipients);
    if (parsed.validEmails.length === 0) {
      throw new Error('No valid recipient email addresses found in the provided input.');
    }

    // 2. Resolve sender
    const sender = await this.resolveSender(senderId);

    const startDate = new Date(startAt);
    const startTimeMs = isNaN(startDate.getTime()) ? Date.now() : startDate.getTime();

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

    // 4. Enqueue BullMQ delayed jobs
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
      } catch (err: any) {
        console.error(`[Queue Enqueue Warning for Job ${record.id}]:`, err.message);
      }
    }

    const firstScheduledAt = emailRecords[0].scheduled_at.toISOString();
    const lastScheduledAt = emailRecords[emailRecords.length - 1].scheduled_at.toISOString();

    return {
      campaignId: campaign.id,
      totalRecipients: parsed.validEmails.length,
      acceptedRecipientCount: parsed.validEmails.length,
      scheduledCount: emailRecords.length,
      firstScheduledAt,
      lastScheduledAt,
      sender: {
        id: sender.id,
        displayName: sender.display_name,
        email: sender.email,
      },
    };
  }
}
