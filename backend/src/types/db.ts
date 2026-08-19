// TypeScript row types mirroring the Postgres schema (users, senders,
// campaigns, scheduled_emails), plus the EmailJobData shape carried by every
// BullMQ email job payload.

export interface User {
  id: string;
  google_subject: string;
  name: string;
  email: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Sender {
  id: string;
  display_name: string;
  email: string;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: boolean;
  is_default: boolean;
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Campaign {
  id: string;
  user_id: string;
  sender_id: string | null;
  subject: string;
  body: string;
  start_at: Date;
  delay_ms: number;
  hourly_limit: number;
  total_recipients: number;
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'paused';
  created_at: Date;
  updated_at: Date;
}

export interface ScheduledEmail {
  id: string;
  campaign_id: string;
  recipient_email: string;
  scheduled_at: Date;
  status: 'scheduled' | 'processing' | 'sent' | 'failed' | 'cancelled';
  bull_job_id: string | null;
  attempts: number;
  sent_at: Date | null;
  failure_reason: string | null;
  idempotency_key: string;
  ethereal_preview_url: string | null;
  is_archived: boolean;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface EmailJobData {
  scheduledEmailId: string;
  campaignId: string;
  userId: string;
  senderId: string | null;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledAt: string;
  delayMs: number;
  hourlyLimit: number;
  idempotencyKey: string;
}
