# ReachInbox Email Scheduler & Dashboard

A production-grade, durable cold-email scheduling system and dashboard built with **Next.js**, **Express.js**, **PostgreSQL**, **Redis**, **BullMQ**, and **Ethereal Email SMTP**.

---

## 1. Architecture Overview

```text
 Browser (Next.js Frontend @ :3000)
    │
    │ HTTP / JSON with HttpOnly Cookie
    ▼
 Express REST API (@ :5000) ──────────► PostgreSQL 16 (Durable Data Source of Record)
    │                                     - users, senders, campaigns, scheduled_emails
    │
    ▼
 Redis 7 + BullMQ Queue Layer
    │  - "email-send-queue" (Durable Delayed Jobs)
    │  - Distributed hourly rate-limit windows (Atomic INCR/DECR)
    │  - Inter-email minimum delay coordinates
    │
    ▼
 BullMQ Worker (@ Concurrency: N)
    │  - Idempotency DB guard (prevents duplicate sends on retries/restarts)
    │  - Quota overflow rescheduling
    │  - Status state transitions (scheduled -> processing -> sent / failed)
    │
    ▼
 Ethereal Email SMTP
    - Safe preview URLs for inspecting delivered outreach emails
```

---

## 2. Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons.
- **Backend**: Express.js, TypeScript, Zod (validation boundary), Cookie Parser, JWT Session.
- **Queue & Scheduler**: BullMQ + Redis (**No cron jobs**).
- **Database**: PostgreSQL 16 with transactional connection pooling.
- **Email Provider**: Ethereal Email SMTP (`nodemailer`) with live test preview links.
- **Container Infrastructure**: Docker Compose for PostgreSQL and Redis.

---

## 3. Key Features & Implementation Highlights

### A. Figma-Matched Dashboard UI
- **Spacious, White-First Design**: Implements the clean, high-contrast layouts specified in `DESIGN.md`.
- **Sidebar Navigation**: Real-time counters for **Scheduled** and **Sent** categories, User profile card, and Google login/logout flow.
- **Scheduled Email List**: Minimal rows with warm scheduled timestamp badges (`[Tue 9:15:12 AM]`), recipient info, subject snippet, and favorite star affordance.
- **Sent Email List**: Sent status badges, error indicators with failure reasons, and direct links to inspect message rendering in Ethereal.
- **Email Detail View**: Detailed message view with back navigation, sender/recipient metadata, formatted rich body, and campaign parameters.

### B. Compose & Recipient Upload
- **Recipient Input**: Outlined green chips with inline addition/deletion and `+N more` expansion.
- **Upload List**: Upload `.csv` or `.txt` recipient lists with automatic regex parsing, duplicate removal, header filtering, and detected-count feedback (`✓ N detected`).
- **Scheduling Controls**: Configurable **Delay between emails** (seconds) and **Hourly Limit** (emails/hr).
- **Send Later Popover**: Preset choices (*Tomorrow 9 AM, Tomorrow 10 AM, Tomorrow 3 PM, In 2 hours*) and custom date-time picker.
- **Rich Text Toolbar**: Bold, italic, underline, strikethrough, lists, blockquotes, and link tools.

### C. Durable Scheduling without Cron (Hard Constraint)
- **Zero Cron**: No `cron`, `node-cron`, Agenda, OS crontabs, or polling loops.
- **Durable Delayed Jobs**: Each recipient send is enqueued into BullMQ with a calculated millisecond delay (`scheduledAt - Date.now()`).
- **Restart Persistence**: If API or worker instances crash or restart, BullMQ and Redis preserve all future delayed jobs. No work is lost or duplicated.
- **Deterministic Job IDs & Idempotency**: Each job is keyed by a unique idempotency key `${campaignId}:${recipientEmail}`. Workers check DB state before dispatching to guarantee that an email is never sent twice.

### D. Distributed Hourly Rate Limiting & Concurrency
- **Redis Atomic Window Counters**: Tracks sends per sender within hourly keys (`ratelimit:sender:{id}:hour:{YYYYMMDDHH}`).
- **Rescheduling on Quota Overflow**: When a sender hits their configured hourly limit, the job is not dropped; instead, it is rescheduled into the next hour window.
- **Inter-Email Delay**: Enforces minimum delay between consecutive sends per sender across concurrent worker threads.

---

## 4. Getting Started & Local Setup

### Prerequisites
- **Node.js**: v18+ (tested on v20/v24)
- **npm**: v9+
- **Docker & Docker Compose** (or local PostgreSQL & Redis instances)

### Step 1: Clone and Configure Environment

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Review environment defaults:
```env
PORT=5000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reachinbox
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
SESSION_SECRET=reachinbox_dev_session_secret_change_in_production_32chars
WORKER_CONCURRENCY=5
DEFAULT_HOURLY_LIMIT=50
DEFAULT_DELAY_MS=2000
```

### Step 2: Start PostgreSQL and Redis Infrastructure

Using Docker Compose:
```bash
docker compose up -d
```

### Step 3: Run Database Migrations

Apply the PostgreSQL database schema and seed default sender configuration:
```bash
npm run migrate --workspace=backend
```

### Step 4: Run the Application

Start backend (Express + BullMQ Worker) and frontend (Next.js) simultaneously:
```bash
npm run dev
```

Or run individual services:
- **Backend API & Worker**: `npm run dev --workspace=backend` (Runs on `http://localhost:5000`)
- **Frontend Dashboard**: `npm run dev --workspace=frontend` (Runs on `http://localhost:3000`)

---

## 5. API Endpoints Reference

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/health` | Service health, DB & Redis connectivity status | No |
| `GET` | `/api/auth/google` | Initiates Google OAuth redirect | No |
| `GET` | `/api/auth/google/callback` | Handles Google OAuth callback & sets session cookie | No |
| `GET` | `/api/auth/me` | Returns current authenticated user | Yes |
| `POST` | `/api/auth/logout` | Clears authentication cookie | Yes |
| `GET` | `/api/senders` | Lists available active senders | Yes |
| `POST` | `/api/schedules` | Creates campaign and enqueues BullMQ delayed jobs | Yes |
| `POST` | `/api/schedules/parse-recipients` | Validates and counts recipients from raw text/CSV | Yes |
| `GET` | `/api/emails/scheduled` | Returns paginated list of scheduled emails | Yes |
| `GET` | `/api/emails/sent` | Returns paginated list of sent/failed emails | Yes |
| `GET` | `/api/emails/counts` | Returns scheduled and sent counts for sidebar | Yes |
| `GET` | `/api/emails/:id` | Returns single email details | Yes |

---

## 6. Running Tests

Run the unit and integration test suite:
```bash
npm test
```

Test coverage includes:
- Recipient parser (CSV, multiline, formatting, deduplication, invalid syntax filtering).
- Hourly rate limit rollover calculation and delay spacing verification.

---

## 7. Assumptions and Trade-offs

1. **Authentication**: Uses real Google OAuth with JWT stored in an `HttpOnly`, `SameSite=Lax` cookie. Email/password inputs are visually matched from Figma for mockup completeness.
2. **Email Provider**: Uses Nodemailer with Ethereal Email SMTP. If credentials are empty in `.env`, the system dynamically creates an Ethereal test account and logs inspection URLs.
3. **Queue Scheduling**: Uses BullMQ delayed jobs exclusively with deterministic job IDs. No cron scheduler is used anywhere in the codebase.
4. **Rate Limit Handling**: When an hourly quota is exceeded, jobs are delayed to the start of the next hour window rather than permanently dropped.
