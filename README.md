<div align="center">

# Reach-Inbox

### Full-Stack Email Job Scheduler & Dashboard

A cold-email scheduler and dashboard built with **Next.js**, **Express.js**, **PostgreSQL**, **Redis**, **BullMQ**, and **Ethereal Email SMTP**. Schedule emails, and they still get sent on time even if the server restarts.

</div>

---

## Contents

1. [Demo Video](#1-demo-video)
2. [Tech Stack](#2-tech-stack)
3. [Local Setup & How to Run](#3-local-setup--how-to-run)
4. [Architecture Overview](#4-architecture-overview)
5. [Deployment](#5-deployment)
6. [Implemented Features Map](#6-implemented-features-map)
7. [Assumptions & Trade-offs](#7-assumptions--trade-offs)
8. [AI Usage & Architecture Note](#8-ai-usage--architecture-note)

---

## 1. Demo Video

Watch the feature walkthrough covering scheduling, the dashboard, and a live restart scenario:

<a href="https://youtu.be/WUhHIoa0FJI" target="_blank" rel="noopener noreferrer">
  <img src="https://i.ytimg.com/vi/WUhHIoa0FJI/maxresdefault.jpg" alt="Reach-Inbox Demo Video" width="100%" />
</a>

👉 <a href="https://youtu.be/WUhHIoa0FJI" target="_blank" rel="noopener noreferrer"><strong>Watch Demo Video on YouTube</strong></a>

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 (App Router), TypeScript | Dashboard UI, routing, server/client rendering |
| Styling | Tailwind CSS | Utility-first styling matched to the Figma design |
| Icons | Lucide Icons | Iconography |
| Backend | Node.js, Express.js, TypeScript | REST API server |
| Queue / Scheduler | BullMQ + Redis | Durable delayed job scheduling (strictly zero cron jobs) |
| Database | PostgreSQL 16 | Relational persistence with connection pooling |
| Email Provider | Ethereal Email SMTP | Sandboxed test email delivery with preview links |
| Local Infrastructure | Docker Compose | Local PostgreSQL & Redis containers |

---

## 3. Local Setup & How to Run

### Prerequisites

| Requirement | Notes |
|---|---|
| Node.js | v18 or newer |
| Docker Desktop | Running locally, or local PostgreSQL & Redis services |

### Step 1 — Environment Variables & Ethereal Setup

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
FRONTEND_URL=http://localhost:3000

# Database Configuration (PostgreSQL 16)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/reachinbox

# Redis Configuration (BullMQ Queue)
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

# Ethereal Email Fake SMTP (leave user/pass blank to auto-generate ephemeral test accounts)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM_NAME=ReachInbox Demo
SMTP_FROM_EMAIL=demo@reachinbox.test

# Frontend Environment Variable
NEXT_PUBLIC_API_URL=http://localhost:5000
```

> **Ethereal Setup Note:** If `SMTP_USER` and `SMTP_PASS` are left empty, the application automatically provisions an ephemeral Ethereal test account on the fly and generates preview links.

### Step 2 — Start Infrastructure (PostgreSQL & Redis)

```bash
docker compose up -d
```

### Step 3 — Run Database Migrations

Applies the PostgreSQL tables (`users`, `senders`, `campaigns`, `scheduled_emails`) and default seed data:

```bash
npm run migrate --workspace=backend
```

### Step 4 — Run the Application

Start both the Backend API + Worker and the Next.js frontend together:

```bash
npm run dev
```

Or run each service in its own terminal:

| Service | Command | Address |
|---|---|---|
| Backend API & BullMQ Worker | `npm run dev:backend` | `http://localhost:5000` |
| Frontend Next.js App | `npm run dev:frontend` | `http://localhost:3000` |

---

## 4. Architecture Overview

### A. How Scheduling Works (Zero Cron)

- When a campaign is scheduled via `POST /api/schedules`, the API works out a send time for each recipient based on the start time and the **inter-email delay** (e.g. 2 seconds apart).
- Each email is saved to the PostgreSQL `scheduled_emails` table with status `scheduled`.
- The API then adds a **BullMQ delayed job** to Redis with `delay = scheduledAt - now` and `jobId = scheduled_emails.id`.
- **No cron jobs, `node-cron`, or polling loops** anywhere — Redis and BullMQ's own delayed queue handle the timing.

### B. Persistence on Restart & Idempotency

| Guarantee | How it's achieved |
|---|---|
| Restart persistence | Everything is written to PostgreSQL and Redis before the job is dispatched, so a server restart doesn't lose anything — BullMQ just picks the delayed jobs back up. |
| Idempotent sending | Each job has a unique key (`campaignId:recipientEmail`). Before sending, the worker checks the DB isn't already marked `sent`, so retries can't double-send. |

### C. Rate Limiting & Concurrency

| Mechanism | Behavior |
|---|---|
| Worker concurrency | Configurable via `WORKER_CONCURRENCY` (default `5`) — runs that many jobs in parallel. |
| Inter-email delay | Minimum gap between sends per sender, mimicking real ESP throttling (default `2s`). |
| Distributed hourly quotas | Redis counters (`ratelimit:sender:{id}:hour:{YYYYMMDDHH}`) track sends per sender for the current UTC hour. |
| Quota rollover | If a sender hits its hourly limit, the job gets pushed to the next hour instead of failing or getting dropped. |

---

## 5. Deployment

The app runs on a few free-tier platforms, with the backend API and the BullMQ worker sharing a single Node process so we don't need two separate services.

| Component | Platform | Role |
|---|---|---|
| Frontend | Vercel | Hosts the Next.js app on a custom subdomain |
| Backend API + Worker | Render (Web Service) | One Node process running the Express API and the BullMQ worker together; runs DB migrations automatically on boot |
| PostgreSQL | Render Managed Database | Relational storage |
| Redis | Upstash (Serverless, TLS) | BullMQ delayed job queue and rate-limit counters |
| DNS | Custom domain, one subdomain per service | Frontend and backend share the same root domain so auth cookies stay first-party |
| Auth | Google OAuth 2.0 | Authorized JavaScript origins and redirect URIs set per environment |
| Uptime | UptimeRobot | Pings the API's health endpoint every 5 minutes so the free-tier backend doesn't spin down from inactivity |

Secrets (database URL, Redis URL, OAuth credentials, session secret) live in each platform's environment variable dashboard, never in source control.

---

## 6. Implemented Features Map

### Backend

| Requirement | Implementation |
|---|---|
| Scheduler | `POST /api/schedules` validates the request, persists the campaign and every recipient row in PostgreSQL, then enqueues one **BullMQ delayed job** per email (`delay = scheduledAt - now`) — no cron, no polling loop |
| Persistence | Campaign and recipient state is written to PostgreSQL *before* the job is enqueued, so it survives a restart even if the enqueue step never runs; a boot-time reconciliation pass re-enqueues any row left without a matching job |
| Rate Limiting | Redis-backed hourly counters keyed by `sender + hour window`, enforced with an atomic Lua script so concurrent workers can't over-count; jobs that would exceed the limit roll into the next hour instead of failing |
| Concurrency | BullMQ worker concurrency is configurable via `WORKER_CONCURRENCY`, with a minimum inter-email delay (`DEFAULT_DELAY_MS`) enforced per sender to mimic provider throttling |
| Email Sending | Nodemailer over Ethereal SMTP, idempotent per job ID so retries can't double-send, with preview-link generation and multi-sender support |
| Auth | Real Google OAuth 2.0 exchange, user profile upsert, and secure HttpOnly JWT session cookies (`/api/auth/*`) |

### Frontend

| Requirement | Implementation |
|---|---|
| Login | Figma-matched login screen with Google OAuth button, avatar/name/email in the header, and a logout option (`/login`) |
| Dashboard | Sidebar with Scheduled/Sent/Archived/Trash/Starred sections and live counters, primary "Compose New Email" action (`/dashboard/*`) |
| Compose | Subject/body editor, CSV/TXT recipient upload with detected-address count, start time, delay-between-emails and hourly-limit controls, Send Later popover |
| Tables | Scheduled and Sent tables/lists with email, subject, time, and status columns, plus loading and empty states |
| Other | Search across recipient/subject/body/sender, per-email detail view, and Archive/Trash actions |

---

## 7. Assumptions & Trade-offs

| # | Assumption / Trade-off | Rationale |
|---|---|---|
| 1 | Email Sandbox | Ethereal Email SMTP is used as required, so no real mail ever goes out. A successful send gives you a preview link; if outbound SMTP is blocked by a local network/firewall, it falls back to a simulated send so the dashboard still shows the full email. |
| 2 | Rate limit overflow | If the hourly limit is hit, jobs get pushed to the next hour window instead of being dropped or rejected. |
| 3 | Database & queue separation | PostgreSQL is the source of truth for email records and campaigns; Redis just handles the delayed queue. |

---

## 8. AI Usage & Architecture Note

Built using an AI-assisted spec-and-execution workflow: `PRD.md` and `DESIGN.md` set the requirements and visual scope up front, `AGENTS.md` governed how the agent worked (drift checks before each step, no silent fixes, one commit per completed milestone), and implementation followed numbered milestone plans (`plans/001`–`008`, tracked in `plans/PLANS.md`).
