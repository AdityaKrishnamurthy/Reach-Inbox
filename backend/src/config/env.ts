// Centralized environment configuration for the backend. Loads .env files
// and exposes a single typed config object (server, database, Redis,
// session, Google OAuth, worker, and SMTP settings) so the rest of the app
// never reads process.env directly.

import dotenv from 'dotenv';
import path from 'path';

// Load root or local .env
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/reachinbox',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  sessionSecret: process.env.SESSION_SECRET || 'reachinbox_dev_session_secret_change_in_production_32chars',
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  },
  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    defaultHourlyLimit: parseInt(process.env.DEFAULT_HOURLY_LIMIT || '50', 10),
    defaultDelayMs: parseInt(process.env.DEFAULT_DELAY_MS || '2000', 10),
  },
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.SMTP_FROM_NAME || 'ReachInbox Demo',
    fromEmail: process.env.SMTP_FROM_EMAIL || 'demo@reachinbox.test',
  }
};
