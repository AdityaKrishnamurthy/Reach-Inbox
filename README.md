# ReachInbox - Full-Stack Email Job Scheduler & Dashboard

A production-grade, durable cold-email scheduling system and dashboard built with **Next.js**, **Express.js**, **PostgreSQL**, **Redis**, **BullMQ**, and **Ethereal Email SMTP**.

## 1. Tech Stack

* **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, Lucide Icons
* **Backend**: Node.js, Express.js, TypeScript
* **Queue / Scheduler**: BullMQ + Redis (**strictly zero cron jobs**)
* **Database**: PostgreSQL 16 (Relational DB with connection pooling)
* **SMTP Provider**: Ethereal Email (Fake SMTP sandbox for testing)
* **Infrastructure**: Docker Compose (PostgreSQL & Redis)

## 2. Setup & How to Run

### Prerequisites
* **Node.js**: v18+
* **Docker Desktop**: Running locally (or local PostgreSQL & Redis services)

### Step 1: Environment Variables & Ethereal Setup

Create `.env` from `.env.example`:
```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

Configure your `.env` file:
```env
# Server Environment & Port
NODE_ENV=development
PORT=5000

# Frontend URL (For CORS and OAuth redirects)
# Local: http://localhost:3000
# Production: https://reachinbox.adityak.tech
FRONTEND_URL=http://localhost:3000

# Database Configuration (PostgreSQL 16)
# Local: postgresql://postgres:postgres@localhost:5432/reachinbox
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reachinbox

# Redis Configuration (BullMQ Queue)
# Local: redis://localhost:6379
REDIS_URL=redis://localhost:6379

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Session JWT Secret (32+ characters)
SESSION_SECRET=reachinbox_secret_key_minimum_32_characters_long

# Worker & Queue Rate Limiting Defaults
WORKER_CONCURRENCY=5
DEFAULT_HOURLY_LIMIT=50
DEFAULT_DELAY_MS=2000

# Ethereal Email Fake SMTP (Leave blank to auto-generate ephemeral test accounts)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# Frontend Environment Variable
NEXT_PUBLIC_API_URL=http://localhost:5000
```

> **Ethereal Setup Note:** If `SMTP_USER` and `SMTP_PASS` are left empty, the application automatically provisions an ephemeral Ethereal test account on the fly and generates test preview links.

### Step 2: Start Infrastructure (PostgreSQL & Redis)

Start PostgreSQL and Redis in the background using Docker Compose:
```bash
docker compose up -d
```

### Step 3: Run Database Migrations

Apply PostgreSQL tables (`users`, `senders`, `campaigns`, `scheduled_emails`) and default seed data:
```bash
npm run migrate --workspace=backend
```

### Step 4: Run the Application

Start both Backend API + Worker and Next.js Frontend simultaneously:
```bash
npm run dev
```

Or run services in separate terminals:
* **Backend API & BullMQ Worker**: `npm run dev:backend` *(Runs on `http://localhost:5000`)*
* **Frontend Next.js App**: `npm run dev:frontend` *(Runs on `http://localhost:3000`)*

## 3. Architecture Overview

### A. How Scheduling Works (Zero Cron)
* When a user schedules a campaign via `POST /api/schedules`, the API calculates discrete execution timestamps for each recipient based on the start time and the configured **inter-email delay** (e.g., 2 seconds).
* Each email record is inserted into the PostgreSQL `scheduled_emails` table in state `scheduled`.
* The API enqueues a **BullMQ delayed job** into Redis with `delay = scheduledAt - now` and `jobId = scheduled_emails.id`.
* **No cron jobs, `node-cron`, or polling loops** are used. Redis timers and BullMQ's internal delayed sorted sets manage precise execution triggers.

### B. Persistence on Restart & Idempotency
* **Restart Persistence**: Because both application state is committed to PostgreSQL and job metadata is committed to Redis before dispatch, stopping or restarting the server retains all pending jobs. When the backend or worker restarts, BullMQ picks up existing delayed jobs exactly at their scheduled times.
* **Idempotency Guard**: Every job is assigned a deterministic idempotency key (`campaignId:recipientEmail`). Before sending, the worker verifies that the database status is not already `sent`, preventing duplicate sends if jobs are retried.

### C. Rate Limiting & Concurrency
* **Worker Concurrency**: The BullMQ worker is instantiated with a configurable concurrency level (`WORKER_CONCURRENCY`, default `5`), safely running parallel job processors.
* **Inter-Email Delay (Throttling)**: A minimum pause between consecutive sends per sender is enforced in the worker logic (e.g., `2` seconds default), mimicking real ESP throttling.
* **Distributed Hourly Quotas**: Redis atomic keys (`ratelimit:sender:{id}:hour:{YYYYMMDDHH}`) track the number of sent emails per sender within the active UTC hour window.
* **Quota Rollover**: If a sender hits their hourly limit (e.g. 50/hr), the worker calculates the time remaining until the next hour window and reschedules the job with a delayed retry instead of failing or dropping it.

## 4. Implemented Features Map

| Module | Assignment Requirement | Implementation Details |
|---|---|---|
| **Frontend** | Google Login UI | Figma-matched login screen with Google OAuth button and error toasts (`/login`). |
| **Frontend** | Navigation & Dashboard | Sidebar with real-time Scheduled/Sent counters, user avatar card, and primary green branding (`/dashboard/*`). |
| **Frontend** | Scheduled & Sent Tables | Status badges (`[Tue 9:15:12 AM]`, `sent`, `failed`), Ethereal preview links, search highlighting, and star affordances. |
| **Frontend** | Compose & Send Later | Rich-text editor toolbar, sender dropdown, delay & hourly limit controls, drag-and-drop upload, and Send Later popover with presets. |
| **Frontend** | Recipient Upload | CSV and TXT file uploader with regex parsing, deduplication, and detected count badges (`✓ N detected`). |
| **Frontend** | Search & Filter Popover | Debounced multi-field search (recipient, subject, body, sender) with interactive status and sorting filter popover. |
| **Frontend** | Email Detail View | Gmail-style typography, full subject display, campaign parameters, and smart back navigation. |
| **Backend** | Google OAuth Login | Real OAuth 2.0 exchange, user profile upsert, and secure HttpOnly JWT session cookies (`/api/auth/*`). |
| **Backend** | Email Scheduler | Campaign persistence in PostgreSQL, BullMQ delayed job enqueuing without cron (`/api/schedules`). |
| **Backend** | Worker & Throttling | Configurable concurrency, inter-email delay spacing, and Redis atomic hourly rate limiting. |
| **Backend** | Email Sending | Nodemailer integration with Ethereal SMTP, preview URL generation, and network fallback resilience. |
| **Backend** | API Endpoints | REST endpoints for scheduled list, sent list, counters, email detail, and recipient parsing. |

## 5. Assumptions & Trade-offs

1. **Email Sandbox**: Ethereal Email SMTP is used as required by the assignment for safe testing without dispatching real spam. When outbound SMTP connects to Ethereal, it generates a direct web preview link. If outbound SMTP port 587 is restricted by local network firewalls, an internal simulation fallback records delivery and renders the full email in the dashboard.
2. **Rate Limit Overflow**: Exceeded hourly limits reschedule jobs into the next available hour window rather than dropping or rejecting them.
3. **Database & Queue Separation**: PostgreSQL serves as the durable source of truth for email records and campaign analytics, while Redis manages the high-throughput delayed execution queue.
