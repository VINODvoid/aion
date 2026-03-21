---
name: AION Technical Architecture
description: Monorepo structure, service boundaries, data flow, and critical system paths
type: project
---

# Technical Architecture

## Stack Summary

| Layer | Technology | Notes |
|---|---|---|
| Mobile | React Native + Expo SDK 54 (bare workflow) | Bare workflow required for native modules |
| iOS enforcement | Swift — FamilyControls / Screen Time API | Requires `com.apple.developer.family-controls` entitlement |
| Android enforcement | Kotlin — UsageStatsManager + overlay | `PACKAGE_USAGE_STATS` permission |
| Backend API | Node.js + Hono | Lightweight, edge-ready, Bun-native |
| Job Queue | BullMQ + Redis | Consequence scheduling, push notification dispatch |
| Database | PostgreSQL + Prisma ORM | Strict mode, all relations explicit |
| Auth | Clerk | Mobile SDK, social login, JWT verification |
| Payments | Razorpay | E-mandate + Route API, server-side only |
| Push Notifications | Expo Push + Firebase FCM | |
| Social | Twitter/X OAuth2 API | Shame post automation |
| Package Manager | Bun | Workspaces, runtime for backend |

---

## Monorepo Structure

```
aion/
├── apps/
│   └── mobile/
│       ├── src/
│       │   ├── app/             # Expo Router file-based navigation
│       │   ├── components/      # Shared UI components
│       │   ├── screens/         # Screen-level components
│       │   ├── hooks/           # Custom React hooks
│       │   ├── stores/          # Zustand state stores
│       │   ├── services/        # API client, auth, notifications
│       │   └── utils/           # Mobile-specific utilities
│       └── modules/
│           ├── ios/             # Swift native module (LockModule)
│           └── android/         # Kotlin native module (LockModule)
│
├── packages/
│   ├── api/
│   │   └── src/
│   │       ├── routes/          # Hono route handlers
│   │       ├── middleware/      # Auth, rate limiting, logging
│   │       ├── services/        # Business logic layer
│   │       └── webhooks/        # Razorpay, Clerk webhooks
│   │
│   ├── db/
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Single source of truth for data models
│   │   │   └── migrations/      # Versioned migration files
│   │   └── src/
│   │       └── client.ts        # Prisma client singleton
│   │
│   ├── queue/
│   │   └── src/
│   │       ├── workers/         # BullMQ workers (one per consequence type)
│   │       ├── jobs/            # Job definitions and type schemas
│   │       ├── schedulers/      # EOD cron schedulers (timezone-aware)
│   │       └── clients/         # Razorpay, Twitter, Expo Push clients
│   │
│   └── shared/
│       └── src/
│           ├── types/           # Shared TypeScript types
│           ├── constants/       # Consequence tiers, XP values, limits
│           └── utils/           # Date/timezone utils, XP calculations
│
├── tasks/                       # Session planning and progress notes
├── .claude/                     # Claude context (this directory)
└── .github/                     # PR templates, issue templates, workflows
```

---

## Service Boundaries

The mobile app **never** directly accesses:
- The PostgreSQL database
- The Redis instance
- Razorpay's API
- Twitter's API

All sensitive operations go through the backend API, authenticated via Clerk JWT. The mobile app
is a thin client: it displays state, collects user input, and calls the API.

```
Mobile App
    │
    │  HTTPS + Clerk JWT
    ▼
Backend API (Hono)
    │              │
    ▼              ▼
PostgreSQL      BullMQ Queue (Redis)
                    │
                    ▼
              Queue Workers
                    │
          ┌─────────┼─────────┐
          ▼         ▼         ▼
      Razorpay   Twitter   Expo Push
```

---

## Consequence Execution Flow (Critical Path)

This is the most important system in AION. Every step must be logged.

```
EOD Cron (23:59 user timezone)
    │
    ├─ Query: all active pacts where today has no check-in
    │
    ├─ For each missed pact:
    │   │
    │   ├─ Does the pact have grace days remaining?
    │   │   ├─ YES: deduct grace day (atomic DB transaction), notify user
    │   │   └─ NO:  enqueue consequence job to BullMQ
    │
    └─ Done

BullMQ Worker picks up consequence job
    │
    ├─ Load consequence record from DB (verify status === 'ARMED')
    ├─ If status !== 'ARMED': log warning, discard job (idempotency guard)
    │
    ├─ Execute by tier:
    │   ├─ Tier 1 (SHAME):     POST shame template to Twitter/X via OAuth2
    │   ├─ Tier 2 (LOCK):      Send push notification → triggers native lock module
    │   ├─ Tier 3 (FINANCIAL): Execute Razorpay mandate charge → route to anti-charity
    │   └─ Tier 4 (NUCLEAR):   Execute Tier 1 + 2 + 3 in parallel
    │
    ├─ On success: update consequence.status = 'FIRED', log firedAt timestamp
    ├─ On failure: retry with exponential backoff (max 3 attempts)
    │             After 3 failures: mark pact as 'DEBT', alert user, halt new pacts
    │
    └─ Send "Consequence Fired" push notification to user
```

---

## Authentication Flow

```
Mobile App
    │
    ├─ Clerk SDK handles login (social + email/password)
    ├─ On login: Clerk issues a short-lived JWT
    │
    └─ Every API request:
        Authorization: Bearer <clerk-jwt>
            │
            ▼
        Backend API middleware
            │
            ├─ Verify JWT with Clerk public key
            ├─ Extract userId (clerkId)
            └─ Attach user context to request
```

---

## Timezone Handling Strategy

User timezone is stored at registration (from device) and can be updated in settings.

- EOD cron: scheduled per-user based on stored timezone
- All dates stored in UTC in the database
- Streak "day" boundaries calculated in the user's timezone at query time
- `packages/shared/src/utils/timezone.ts` is the single source of timezone utilities

---

## Database Indexes (Performance-Critical)

```sql
-- Most common query: get today's check-ins for a user's active pacts
CREATE INDEX idx_checkin_pact_date ON CheckIn(pactId, date);

-- EOD cron: find all active pacts missing today's check-in
CREATE INDEX idx_pact_user_status ON Pact(userId, status);

-- Streak lookups
CREATE INDEX idx_streak_pact ON Streak(pactId);

-- XP log aggregation
CREATE INDEX idx_xplog_user ON XPLog(userId, createdAt);
```

---

## Environment Variables

```
# packages/api + packages/queue
DATABASE_URL=
REDIS_URL=
CLERK_SECRET_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
EXPO_PUSH_ACCESS_TOKEN=

# apps/mobile (public — prefixed with EXPO_PUBLIC_)
EXPO_PUBLIC_API_URL=
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=
```

Never commit `.env` files. Use `.env.example` with placeholder values.
