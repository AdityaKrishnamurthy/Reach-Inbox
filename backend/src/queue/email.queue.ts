// BullMQ producer side for the email-send queue: defines the queue with
// retry/backoff defaults, and exposes helpers to enqueue a delayed send job
// (keyed by the scheduled_emails row id so re-enqueues are naturally
// deduplicated), best-effort cancel a not-yet-run job, and read queue
// metrics.

import { Queue, JobsOptions } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { EmailJobData } from '../types/db';

export const EMAIL_QUEUE_NAME = 'email-send-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    removeOnComplete: false,
    removeOnFail: false,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },
});

emailQueue.on('error', (err) => {
  console.error('[BullMQ Email Queue Error]:', err.message);
});

/**
 * Enqueues a delayed email job into BullMQ
 */
export const enqueueEmailJob = async (
  jobData: EmailJobData,
  delayMs: number,
  customJobId?: string
) => {
  const options: JobsOptions = {
    delay: Math.max(0, delayMs),
    jobId: customJobId || jobData.scheduledEmailId,
  };

  return emailQueue.add('send-email', jobData, options);
};

/**
 * Best-effort cancellation of a not-yet-processed job (used when a still-pending
 * scheduled email is deleted). Safe to call even if the job already ran or was
 * never enqueued - a missing job is not an error here.
 */
export const cancelEmailJob = async (jobId: string): Promise<void> => {
  const job = await emailQueue.getJob(jobId);
  if (job) {
    const state = await job.getState();
    if (state !== 'active' && state !== 'completed') {
      await job.remove();
    }
  }
};

/**
 * Get queue metrics
 */
export const getQueueStats = async () => {
  const [waiting, active, delayed, completed, failed] = await Promise.all([
    emailQueue.getWaitingCount(),
    emailQueue.getActiveCount(),
    emailQueue.getDelayedCount(),
    emailQueue.getCompletedCount(),
    emailQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    delayed,
    completed,
    failed,
    total: waiting + active + delayed + completed + failed,
  };
};
