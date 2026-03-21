# AION — Claude Project Instructions

## What This Project Is

AION is a habit tracker built on loss aversion. Users create "pacts" with real consequences for failure:
shame posts to X/Twitter, phone locks via OS APIs, and financial penalties donated to organizations
they dislike. The consequence engine is the core value proposition — treat it as production-critical
infrastructure, not an afterthought.

See `.claude/context.md` for product context, `.claude/architecture.md` for technical decisions,
and `.claude/conventions.md` for code standards.

---

## Current Phase

**MVP — V1 (Solo Mode)**. No social features yet. Focus: pact CRUD, check-ins, streak tracking,
XP/leveling, all 4 consequence tiers, Razorpay integration, Twitter/X OAuth2, push notifications.

See `PROGRESS.md` for feature-level status.

---

## Key Commands

```bash
# Install all workspace dependencies
bun install

# Run backend API (Hono)
bun run dev:api

# Run queue workers (BullMQ)
bun run dev:queue

# Run mobile app (Metro + Expo)
bun run dev:mobile

# Database migrations
bun run db:migrate

# Database studio (Prisma)
bun run db:studio

# Type-check all packages
bun run typecheck

# Lint all packages
bun run lint

# Run all tests
bun run test
```

---

## Monorepo Structure

```
aion/
├── apps/
│   └── mobile/              # React Native + Expo SDK 54 (bare workflow)
│       └── modules/
│           ├── ios/         # Swift — FamilyControls / Screen Time enforcement
│           └── android/     # Kotlin — UsageStats overlay enforcement
├── packages/
│   ├── api/                 # Hono backend API server
│   ├── db/                  # Prisma schema + PostgreSQL migrations
│   ├── queue/               # BullMQ workers (consequence scheduling)
│   └── shared/              # TypeScript types, constants, utilities
├── tasks/                   # Task planning and session notes
├── .claude/                 # Claude context files
├── .github/                 # PR templates, issue templates
├── CLAUDE.md                # This file
└── PROGRESS.md              # Feature progress tracker
```

---

## Critical Paths — Handle With Extra Care

### 1. Consequence Engine (`packages/queue/`)

This is the most failure-sensitive system. A bug here fires real financial charges, posts to
someone's Twitter, or locks their phone. Rules:

- Every consequence job must be idempotent (safe to retry without double-firing)
- Log every step: job enqueued, job picked up, consequence fired, result
- Always check `consequence.status === 'ARMED'` before executing — never re-fire a FIRED consequence
- Financial jobs must verify Razorpay mandate status before charging
- Test consequence logic against a mock payment provider, never against live Razorpay in dev

### 2. Payment Code (`packages/queue/`, `packages/api/`)

- Razorpay mandate creation and execution happen **server-side only** — never in the mobile app
- Never log full card details, mandate IDs in plaintext, or payment amounts in user-facing logs
- All Razorpay webhook endpoints must verify the `X-Razorpay-Signature` header
- Financial consequence amounts are immutable after pact creation — no client-side overrides

### 3. Streak and Grace Day Logic (`packages/api/`, `packages/queue/`)

- Streak calculation must be timezone-aware (use user's stored timezone, not server timezone)
- Grace day deduction happens in the same DB transaction as the missed-check-in record
- EOD cron job runs at `23:59` in **each user's timezone** — not a single global cron

---

## Security Rules (Project-Specific)

- Never expose Razorpay secret keys, Redis connection strings, or Clerk secret keys to the mobile app
- Mobile app communicates with the backend via authenticated API only — no direct DB or Redis access
- Twitter/X OAuth tokens stored encrypted in the DB (`twitterTokens` field) — never in device storage
- All API endpoints that trigger consequences require server-side auth verification (Clerk JWT)
- Shame post template is stored server-side and rendered server-side before posting — never trust client

---

## Testing Requirements

- Consequence engine workers: unit tests with mocked Razorpay + Twitter clients
- API routes: integration tests hitting a test PostgreSQL database (no mocks for DB)
- Streak logic: unit tests covering edge cases — timezone boundaries, grace day exhaustion,
  monthly grace day resets, pact completion on final day
- Mobile: Expo's built-in testing for UI components, E2E with Detox for critical flows
  (pact creation, check-in, consequence setup)

---

## What NOT to Do

- Do not add Razorpay SDK to the mobile app — backend only
- Do not store OAuth tokens in AsyncStorage — use Expo SecureStore
- Do not fire consequences from the mobile client — always trigger via backend API
- Do not skip timezone handling for EOD checks — this will cause incorrect consequence fires
- Do not allow mid-streak consequence tier downgrades — this is a core product rule, not a bug
- Do not batch check-ins for past days — time-gating is intentional product behavior
