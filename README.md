<div align="center">

# AION

### The habit tracker that punishes you for quitting.

Built on loss aversion — the psychological principle that the pain of losing is twice as powerful
as the pleasure of gaining. Every other habit tracker rewards you for showing up.
AION makes you pay for not showing up.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Bun](https://img.shields.io/badge/Bun-1.x-fbf0df?style=flat-square&logo=bun&logoColor=black)](https://bun.sh/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev/)
[![Hono](https://img.shields.io/badge/Hono-4.x-E36002?style=flat-square)](https://hono.dev/)
[![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)

</div>

---

## What is AION?

AION lets you create **pacts** — commitments with real stakes. Miss a day and one of four
consequences fires automatically:

| Tier | Name          | What happens                                                         |
| ---- | ------------- | -------------------------------------------------------------------- |
| 1    | **Shame**     | Auto-posts to your X/Twitter: _"I broke my pact to [habit]. Day 0."_ |
| 2    | **Lock**      | Triggers Focus Mode / app lock on your phone for 30–60 minutes       |
| 3    | **Financial** | Charges you ₹50–500 and donates it to an organization you dislike    |
| 4    | **Nuclear**   | All three. Simultaneously.                                           |

The consequence is armed the moment you create the pact. You can't downgrade mid-streak.
You chose the stakes — you live with them.

---

## Features

- **Pact engine** — daily and weekly commitments with fixed or infinite durations
- **Streak tracking** — GitHub-style heat map, streak counter, XP multipliers
- **XP & leveling** — every check-in earns XP; longer streaks multiply it
- **Grace days** — 1–2 per month, no rollover. An emergency valve, not a safety net
- **Consequence engine** — idempotent, retryable, timezone-aware consequence scheduling via BullMQ
- **Razorpay e-mandates** — pre-authorized financial consequences, server-side only
- **Twitter/X OAuth2** — shame post automation with pre-written templates
- **Native phone lock** — iOS FamilyControls + Android UsageStats overlay
- **Push notifications** — reminders and consequence alerts via Expo Push / FCM

---

## Tech Stack

```
Mobile        →  React Native + Expo SDK 54 (bare workflow) + Expo Router
Backend API   →  Node.js + Hono (Bun runtime)
Job Queue     →  BullMQ + Redis 7.2
Database      →  PostgreSQL 16 + Prisma ORM
Auth          →  Clerk
Payments      →  Razorpay (e-mandate + Route API)
Social        →  Twitter/X OAuth2
Notifications →  Expo Push + Firebase FCM
Monorepo      →  Bun workspaces
```

---

## Project Structure

```
aion/
├── apps/
│   └── mobile/              # React Native + Expo SDK 54
│       └── modules/
│           ├── ios/         # Swift — FamilyControls (Screen Time enforcement)
│           └── android/     # Kotlin — UsageStats overlay enforcement
│
├── packages/
│   ├── api/                 # Hono backend API server
│   ├── db/                  # Prisma schema + PostgreSQL migrations
│   ├── queue/               # BullMQ workers (consequence scheduling)
│   └── shared/              # TypeScript types, constants, utilities
│
├── .claude/                 # Project context for Claude Code sessions
├── .github/                 # PR templates, issue templates
├── docker-compose.yml       # Local PostgreSQL + Redis
├── PROGRESS.md              # Feature-level build status
└── CLAUDE.md                # Project instructions for Claude Code
```

---

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) `>= 1.0`
- [Docker](https://www.docker.com/) (for local PostgreSQL + Redis)
- [Expo CLI](https://docs.expo.dev/get-started/installation/) — installed via `bunx`
- iOS: Xcode 15+ / Android: Android Studio Hedgehog+

### 1. Clone and install

```bash
git clone https://github.com/VINODvoid/aion.git
cd aion
bun install
```

### 2. Start local services

```bash
# Starts PostgreSQL 16 on :5432 and Redis 7.2 on :6379
docker compose up -d
```

### 3. Configure environment variables

Each package has a `.env.example`. Copy and fill in:

```bash
cp packages/db/.env.example packages/db/.env
cp packages/api/.env.example packages/api/.env
cp packages/queue/.env.example packages/queue/.env
cp apps/mobile/.env.example apps/mobile/.env
```

> **Note:** Never commit `.env` files. See [Security](#security) below.

### 4. Set up the database

```bash
# Run migrations and generate the Prisma client
bun run db:migrate
bun run db:generate
```

### 5. Run the stack

Open three terminals:

```bash
# Terminal 1 — Backend API (port 3001)
bun run dev:api

# Terminal 2 — Queue workers
bun run dev:queue

# Terminal 3 — Mobile app (Metro bundler)
bun run dev:mobile
```

---

## Development Commands

```bash
bun install              # Install all workspace dependencies
bun run dev:api          # Start Hono backend (hot reload)
bun run dev:queue        # Start BullMQ workers (hot reload)
bun run dev:mobile       # Start Expo / Metro bundler

bun run db:migrate       # Run pending Prisma migrations
bun run db:generate      # Regenerate Prisma client after schema changes
bun run db:studio        # Open Prisma Studio (database GUI)
bun run db:seed          # Seed the database with dev data

bun run typecheck        # Type-check all packages
bun run lint             # Lint all packages
bun run test             # Run all tests
```

---

## Git Workflow

AION uses **GitHub Flow** with a `develop` integration branch. See `.claude/git-workflow.md`
for the full branch strategy, commit conventions, and PR process.

**Branch naming:**

```
feature/AION-<ticket>-<description>
fix/AION-<ticket>-<description>
hotfix/<description>
release/<semver>
chore/<description>
```

**Commit convention** — [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(api): add POST /pacts endpoint
fix(queue): prevent double-fire on consequence retry
chore(db): add Prisma schema with User model
test(queue): add grace day exhaustion edge case tests
```

---

## Architecture Notes

### Consequence Engine

The consequence engine (`packages/queue/`) is production-critical. A bug here fires real charges,
posts to real Twitter accounts, or locks real phones. Key rules:

- Every consequence job is **idempotent** — safe to retry without double-firing
- Always checks `consequence.status === 'ARMED'` before executing
- Financial jobs verify Razorpay mandate status before charging
- EOD cron runs at `23:59` in **each user's timezone** — not a single global cron

### Payment Security

- Razorpay mandate creation and execution are **server-side only** — never in the mobile app
- Webhook endpoints verify the `X-Razorpay-Signature` header before processing
- Financial consequence amounts are immutable after pact creation

### Phone Lock (Tier 2)

- **iOS**: Uses the `FamilyControls` Screen Time API (`com.apple.developer.family-controls`
  entitlement). Requires explicit approval from Apple — submit early.
- **Android**: Uses `UsageStatsManager` + a full-screen overlay. Requires `PACKAGE_USAGE_STATS`
  permission.

Both platforms expose a unified JS interface: `LockModule.enableLock(durationMinutes)`.

---

## Security

- Never commit `.env` files, keys, or secrets
- Twitter/X OAuth tokens are stored **encrypted in the database** — never on the device
- The mobile app communicates with the backend via authenticated API only (Clerk JWT)
- Shame post templates are rendered **server-side** before posting — the client is never trusted

If you discover a security issue, do not open a public issue. Contact the maintainer directly.

---

## Testing

```bash
bun run test                   # Run all tests across all packages
bun run --cwd packages/api test        # API integration tests (real PostgreSQL)
bun run --cwd packages/queue test      # Queue worker unit tests (mocked clients)
```

Test requirements:

- **Consequence workers**: unit tests with mocked Razorpay + Twitter clients
- **API routes**: integration tests hitting a real test database (no DB mocks)
- **Streak logic**: unit tests for timezone boundaries, grace day exhaustion, monthly resets
- **Mobile**: Detox E2E for pact creation, check-in, and consequence setup flows

---

## Roadmap

- **MVP (V1)** — Solo mode: pact CRUD, all 4 consequence tiers, Razorpay, Twitter/X, streaks, XP
- **V1.5** — Home screen widget, proof-based check-ins, expanded anti-charity list
- **V2** — Social layer: accountability partners, group pacts, leaderboards
- **V3** — Monetization: free tier + Pro (₹199/month)

See [`PROGRESS.md`](./PROGRESS.md) for the current build status.

---

## Contributing

1. Branch off `develop`: `git checkout -b feature/AION-<ticket>-<description>`
2. Write code with meaningful comments — explain _why_, not _what_
3. Commit atomically — one unit of work per commit
4. Open a PR against `develop` using the PR template
5. All checks must pass before merge

---

<div align="center">

_AION — The God of Cyclical Time. Show up, or pay the price._

</div>
