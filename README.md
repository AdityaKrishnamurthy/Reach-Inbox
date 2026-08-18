<div align="center">

# Reach-Inbox

### Full-Stack Email Job Scheduler & Dashboard

A cold-email scheduler and dashboard built with **Next.js**, **Express.js**, **PostgreSQL**, **Redis**, **BullMQ**, and **Ethereal Email SMTP**. Schedule emails, and they still get sent on time even if the server restarts.

</div>

---

## Contents

1. [Tech Stack](#1-tech-stack)
2. [Local Setup & How to Run](#2-local-setup--how-to-run)
3. [Architecture Overview](#3-architecture-overview)
4. [Deployment](#4-deployment)
5. [Implemented Features Map](#5-implemented-features-map)
6. [Assumptions & Trade-offs](#6-assumptions--trade-offs)
7. [AI Usage & Architecture Note](#7-ai-usage--architecture-note)

---

## 1. Tech Stack

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

## 2. Local Setup & How to Run

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

## 3. Architecture Overview

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

## 4. Deployment

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

## 5. Implemented Features Map

| Module | Assignment Requirement | Implementation Details |
|---|---|---|
| Frontend | Google Login UI | Figma-matched login screen with Google OAuth button and error toasts (`/login`) |
| Frontend | Navigation & Dashboard | Sidebar with real-time Scheduled/Sent counters, user avatar card, and primary green branding (`/dashboard/*`) |
| Frontend | Scheduled & Sent Tables | Status badges, Ethereal preview links, search highlighting, and star affordances |
| Frontend | Compose & Send Later | Rich-text editor toolbar, sender dropdown, delay & hourly limit controls, drag-and-drop upload, and Send Later popover with presets |
| Frontend | Recipient Upload | CSV and TXT file uploader with regex parsing, deduplication, and detected-count badges |
| Frontend | Search & Filter Popover | Debounced multi-field search (recipient, subject, body, sender) with an interactive status and sorting filter popover |
| Frontend | Email Detail View | Gmail-style typography, full subject display, campaign parameters, and smart back navigation |
| Backend | Google OAuth Login | Real OAuth 2.0 exchange, user profile upsert, and secure HttpOnly JWT session cookies (`/api/auth/*`) |
| Backend | Email Scheduler | Campaign persistence in PostgreSQL, BullMQ delayed job enqueuing without cron (`/api/schedules`) |
| Backend | Worker & Throttling | Configurable concurrency, inter-email delay spacing, and Redis atomic hourly rate limiting |
| Backend | Email Sending | Nodemailer integration with Ethereal SMTP, preview URL generation, and network fallback resilience |
| Backend | API Endpoints | REST endpoints for scheduled list, sent list, counters, email detail, and recipient parsing |

---

## 6. Assumptions & Trade-offs

| # | Assumption / Trade-off | Rationale |
|---|---|---|
| 1 | Email Sandbox | Ethereal Email SMTP is used as required, so no real mail ever goes out. A successful send gives you a preview link; if outbound SMTP is blocked by a local network/firewall, it falls back to a simulated send so the dashboard still shows the full email. |
| 2 | Rate limit overflow | If the hourly limit is hit, jobs get pushed to the next hour window instead of being dropped or rejected. |
| 3 | Database & queue separation | PostgreSQL is the source of truth for email records and campaigns; Redis just handles the delayed queue. |

---

## 7. AI Usage & Architecture Note

Built using an AI-assisted spec-and-execution workflow: `PRD.md` and `DESIGN.md` set the requirements and visual scope up front, `AGENTS.md` governed how the agent worked (drift checks before each step, no silent fixes, one commit per completed milestone), and implementation followed numbered milestone plans (`plans/001`–`008`, tracked in `plans/PLANS.md`).
