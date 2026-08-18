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
