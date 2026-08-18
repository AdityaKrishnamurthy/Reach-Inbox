import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { EMAIL_QUEUE_NAME, enqueueEmailJob } from '../queue/email.queue';
import { config } from '../config/env';
import { query } from '../db';
import { EmailJobData, ScheduledEmail, Sender } from '../types/db';
import { SmtpService } from '../services/smtp.service';
import { RateLimitService } from '../services/rate-limit.service';

export class EmailWorker {
  private static workerInstance: Worker<EmailJobData> | null = null;

  static startWorker(): Worker<EmailJobData> {
    if (this.workerInstance) {
      return this.workerInstance;
    }

    console.log(`[Email Worker] Starting worker with concurrency: ${config.worker.concurrency}...`);

    this.workerInstance = new Worker<EmailJobData>(
      EMAIL_QUEUE_NAME,
      async (job: Job<EmailJobData>) => {
        return this.processJob(job);
      },
      {
        connection: createRedisConnection(),
        concurrency: config.worker.concurrency,
        limiter: {
          max: 100,
          duration: 1000,
        },
      }
    );

    this.workerInstance.on('completed', (job: Job<EmailJobData>, result: any) => {
      console.log(`[Email Worker] Job ${job.id} completed. Result:`, result?.status || 'sent');
    });

    this.workerInstance.on('failed', (job: Job<EmailJobData> | undefined, err: Error) => {
      console.error(`[Email Worker] Job ${job?.id} failed:`, err.message);
    });

    this.workerInstance.on('error', (err: Error) => {
      console.error('[Email Worker Global Error]:', err.message);
    });

    return this.workerInstance;
  }

  static async stopWorker(): Promise<void> {
    if (this.workerInstance) {
      console.log('[Email Worker] Stopping worker...');
      await this.workerInstance.close();
      this.workerInstance = null;
    }
  }

  /**
   * Main idempotent job processor
   */
  private static async processJob(job: Job<EmailJobData>): Promise<any> {
    const {
      scheduledEmailId,
      campaignId,
      senderId,
      recipientEmail,
      subject,
      body,
      hourlyLimit = config.worker.defaultHourlyLimit,
      delayMs = config.worker.defaultDelayMs,
    } = job.data;

    // 1. Idempotency Check: Verify database state
    const dbEmailRes = await query<ScheduledEmail>(
      'SELECT id, status, attempts, is_deleted FROM scheduled_emails WHERE id = $1',
      [scheduledEmailId]
    );

    if (dbEmailRes.rows.length === 0) {
      console.warn(`[Email Worker] Job ${job.id} record not found in database. Skipping.`);
      return { status: 'skipped', reason: 'record_not_found' };
    }

    const emailRecord = dbEmailRes.rows[0];

    // Prevent duplicate sending if already sent
    if (emailRecord.status === 'sent') {
      console.log(`[Email Worker] Job ${job.id} already marked as 'sent'. Skipping duplicate.`);
      return { status: 'skipped', reason: 'already_sent' };
    }

    // Skip if deleted after being enqueued (best-effort job cancellation in
    // EmailService.softDeleteEmail can miss a job that was already 'active')
    if (emailRecord.is_deleted) {
      console.log(`[Email Worker] Job ${job.id} was deleted. Skipping send.`);
      if (emailRecord.status === 'scheduled' || emailRecord.status === 'processing') {
        await query(`UPDATE scheduled_emails SET status = 'cancelled' WHERE id = $1`, [scheduledEmailId]);
      }
      return { status: 'skipped', reason: 'deleted' };
    }

    // 2. Distributed Rate Limiting & Inter-Email Delay
    const effectiveSenderId = senderId || 'default';
    const slot = await RateLimitService.acquireSendSlot(effectiveSenderId, hourlyLimit, delayMs);

    if (!slot.allowed && slot.reason === 'HOURLY_LIMIT_REACHED') {
      const retryDelay = slot.retryAfterMs || 60000;
      console.log(
        `[Email Worker] Hourly limit reached for sender ${effectiveSenderId}. Rescheduling job ${job.id} for ${Math.round(retryDelay / 1000)}s later.`
      );

      // Reschedule durable job into the next available hour window
      await enqueueEmailJob(job.data, retryDelay);

      // Keep record in 'scheduled' state
      return { status: 'rescheduled', retryAfterMs: retryDelay };
    }

    // 3. Update state to 'processing'
    await query(
      'UPDATE scheduled_emails SET status = $1, attempts = attempts + 1, updated_at = NOW() WHERE id = $2',
      ['processing', scheduledEmailId]
    );

    // 4. Retrieve sender configuration
    let sender: Sender | null = null;
    if (senderId) {
      const senderRes = await query<Sender>(
        'SELECT * FROM senders WHERE id = $1 LIMIT 1',
        [senderId]
      );
      if (senderRes.rows.length > 0) {
        sender = senderRes.rows[0];
      }
    }

    // 5. Send email via SMTP
    try {
      const sendResult = await SmtpService.sendEmail({
        sender,
        to: recipientEmail,
        subject,
        html: body,
      });

      // 6. Update state to 'sent'
      await query(
        `UPDATE scheduled_emails
         SET status = 'sent',
             sent_at = NOW(),
             ethereal_preview_url = $1,
             failure_reason = NULL,
             updated_at = NOW()
         WHERE id = $2`,
        [sendResult.previewUrl, scheduledEmailId]
      );

      // Check if campaign is now completed
      await this.checkAndUpdateCampaignCompletion(campaignId);

      return {
        status: 'sent',
        messageId: sendResult.messageId,
        previewUrl: sendResult.previewUrl,
      };
    } catch (sendError: any) {
      console.error(`[Email Worker Send Error for ${recipientEmail}]:`, sendError.message);

      // Update state to 'failed'
      await query(
        `UPDATE scheduled_emails
         SET status = 'failed',
             failure_reason = $1,
             updated_at = NOW()
         WHERE id = $2`,
        [sendError.message || 'SMTP sending failed', scheduledEmailId]
      );

      // Check if campaign is completed/failed
      await this.checkAndUpdateCampaignCompletion(campaignId);

      throw sendError;
    }
  }

  /**
   * Updates campaign status when all recipient jobs are resolved
   */
  private static async checkAndUpdateCampaignCompletion(campaignId: string): Promise<void> {
    try {
      const pendingRes = await query(
        `SELECT COUNT(*) as count
         FROM scheduled_emails
         WHERE campaign_id = $1 AND status IN ('scheduled', 'processing')`,
        [campaignId]
      );

      if (parseInt(pendingRes.rows[0].count, 10) === 0) {
        await query(
          `UPDATE campaigns
           SET status = 'completed', updated_at = NOW()
           WHERE id = $1`,
          [campaignId]
        );
      }
    } catch (err: any) {
      console.warn('[Campaign Completion Update Warning]:', err.message);
    }
  }
}

export const startEmailWorker = () => EmailWorker.startWorker();
export const stopEmailWorker = () => EmailWorker.stopWorker();
