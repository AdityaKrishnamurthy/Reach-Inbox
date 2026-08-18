# ReachInbox Email Scheduler

Full-stack hiring assignment implementation plan for a durable email scheduler and dashboard.

## Stack

- Next.js + TypeScript + Tailwind CSS
- Express.js + TypeScript
- BullMQ + Redis
- PostgreSQL
- Ethereal Email SMTP
- Docker Compose

## Source of Truth

- `PRD.md` — requirements and acceptance criteria.
- `DESIGN.md` — Figma-derived frontend design.
- `AGENTS.md` — agent execution rules.
- `CLAUDE.md` — delegates to `AGENTS.md`.
- `plans/PLANS.md` — implementation sequence/status.

## Important Constraint

Scheduling must use BullMQ delayed jobs backed by Redis. Cron jobs are explicitly forbidden.

## Planned Repository

```text
.
├── AGENTS.md
├── CLAUDE.md
├── DESIGN.md
├── PRD.md
├── README.md
├── plans/
│   ├── PLANS.md
│   ├── 001-project-setup.md
│   ├── 002-infrastructure-and-database.md
│   ├── 003-authentication-and-user-session.md
│   ├── 004-email-scheduling-and-queue.md
│   ├── 005-worker-rate-limiting-and-sending.md
│   ├── 006-frontend-dashboard.md
│   ├── 007-compose-upload-and-scheduling-ui.md
│   └── 008-testing-reliability-and-documentation.md
├── frontend/
└── backend/
```

## Agent Workflow

Read `AGENTS.md`, then `PRD.md`, `DESIGN.md`, `plans/PLANS.md`, and the active plan. Run the active plan's drift check before coding.

The agent must stop and ask before destructive actions, material changes to architecture, adding unplanned dependencies, or resolving failed drift checks by improvisation.

## Git

Use small verified commits. Commit messages should be plain human-readable descriptions and must not use `feat:`, `fix:`, `chore:`, or other Conventional Commit prefixes.
