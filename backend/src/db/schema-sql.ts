export const SCHEMA_SQL = `
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    google_subject VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS senders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    smtp_host VARCHAR(255) NOT NULL,
    smtp_port INTEGER NOT NULL DEFAULT 587,
    smtp_user VARCHAR(255) NOT NULL,
    smtp_pass VARCHAR(255) NOT NULL,
    smtp_secure BOOLEAN NOT NULL DEFAULT FALSE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_senders_updated_at ON senders;
CREATE TRIGGER trg_senders_updated_at
    BEFORE UPDATE ON senders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES senders(id) ON DELETE SET NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    start_at TIMESTAMPTZ NOT NULL,
    delay_ms INTEGER NOT NULL DEFAULT 2000,
    hourly_limit INTEGER NOT NULL DEFAULT 50,
    total_recipients INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'scheduled';

DROP TRIGGER IF EXISTS trg_campaigns_updated_at ON campaigns;
CREATE TRIGGER trg_campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS scheduled_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    recipient_email VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'scheduled',
    bull_job_id VARCHAR(255),
    attempts INTEGER NOT NULL DEFAULT 0,
    failure_reason TEXT,
    ethereal_preview_url TEXT,
    idempotency_key VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE scheduled_emails ADD COLUMN IF NOT EXISTS bull_job_id VARCHAR(255);

DROP TRIGGER IF EXISTS trg_scheduled_emails_updated_at ON scheduled_emails;
CREATE TRIGGER trg_scheduled_emails_updated_at
    BEFORE UPDATE ON scheduled_emails
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_scheduled_emails_campaign_id ON scheduled_emails(campaign_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_status ON scheduled_emails(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_emails_scheduled_at ON scheduled_emails(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
`;
