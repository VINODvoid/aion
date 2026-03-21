# AION — Build Progress

**Phase**: MVP (V1) — Solo Mode
**Started**: March 2026
**Target**: App Store + Play Store submission

---

## Infrastructure & Tooling

- [ ] Monorepo scaffold (Bun workspaces, package structure)
- [ ] TypeScript configuration (strict mode, path aliases per package)
- [ ] ESLint + Prettier configuration
- [ ] Prisma schema (all data models)
- [ ] Initial database migration
- [ ] Redis setup (local dev via Docker)
- [ ] Environment variable setup (`.env.example` per package)
- [ ] CI pipeline (GitHub Actions: typecheck, lint, test on PR)
- [ ] Expo bare workflow setup with Expo Router
- [ ] Bun workspace scripts wired up

---

## Backend API (`packages/api`)

- [ ] Hono server setup with Clerk auth middleware
- [ ] Health check endpoint
- [ ] User routes (create, get profile, update timezone)
- [ ] Pact routes (create, list, get, pause, delete)
- [ ] Check-in routes (submit, get by pact/date)
- [ ] Streak routes (get current streak, heat map data)
- [ ] XP routes (get total XP, level, log)
- [ ] Consequence routes (get status, get history)
- [ ] Grace day routes (get remaining, use grace day)
- [ ] Razorpay webhook handler
- [ ] Clerk webhook handler (user.created → create DB record)
- [ ] Twitter/X OAuth2 callback handler
- [ ] Rate limiting middleware
- [ ] Request logging middleware

---

## Consequence Engine (`packages/queue`)

- [ ] BullMQ + Redis connection setup
- [ ] EOD scheduler (timezone-aware, per-user cron)
- [ ] Missed check-in detection job
- [ ] Grace day deduction logic
- [ ] Consequence job schema and type definitions
- [ ] Shame post worker (Twitter/X API integration)
- [ ] Lock notification worker (push notification → native module)
- [ ] Financial consequence worker (Razorpay mandate execution)
- [ ] Nuclear worker (Tier 1 + 2 + 3 in parallel)
- [ ] Consequence idempotency guard (status === 'ARMED' check)
- [ ] Retry logic with exponential backoff
- [ ] Debt state handling (failed payment → block new pacts)
- [ ] "Pact complete — consequence disarmed" flow

---

## Payments — Razorpay (`packages/api` + `packages/queue`)

- [ ] Razorpay client setup (test environment)
- [ ] E-mandate creation on Tier 3/4 pact setup
- [ ] Anti-charity selection (curated NGO list)
- [ ] Mandate execution on consequence fire
- [ ] Route API integration (direct to NGO)
- [ ] Webhook signature verification
- [ ] Payment failure → debt state handling
- [ ] Mandate cancellation on pact completion
- [ ] Test suite against Razorpay test environment

---

## Social Integration — Twitter/X

- [ ] Twitter/X OAuth2 app registration
- [ ] OAuth2 flow in mobile app (expo-auth-session)
- [ ] Token storage (encrypted in DB — never on device)
- [ ] Shame post template storage per pact
- [ ] Post execution in shame worker
- [ ] Token refresh handling
- [ ] Revocation on pact deletion or account disconnect

---

## Database (`packages/db`)

- [ ] `User` model + migration
- [ ] `Pact` model + migration
- [ ] `CheckIn` model + migration
- [ ] `Streak` model + migration
- [ ] `Consequence` model + migration
- [ ] `GraceDay` model + migration
- [ ] `XPLog` model + migration
- [ ] Performance indexes (see architecture.md)
- [ ] Seed data for development

---

## Mobile App (`apps/mobile`)

### Foundation
- [ ] Expo bare workflow setup
- [ ] Expo Router file-based navigation
- [ ] Clerk auth (sign up, sign in, social login)
- [ ] API client setup (TanStack Query)
- [ ] Zustand store setup (pact, user, streak stores)
- [ ] Push notification registration (Expo Push)
- [ ] Theme setup (dark/light, AION brand tokens)

### Screens
- [ ] Onboarding / sign up flow
- [ ] Daily dashboard (home screen)
- [ ] Pact creation flow (multi-step wizard)
- [ ] Pact detail screen (streak, heat map, check-in)
- [ ] Check-in screen (with optional proof attachment)
- [ ] Consequence setup screen (tier selection, config)
- [ ] Razorpay mandate setup screen
- [ ] Twitter/X connect screen
- [ ] Pact completion screen ("CONSEQUENCE DISARMED")
- [ ] Pact failure screen (consequence fired notification)
- [ ] User profile screen (XP, level, badges)
- [ ] Settings screen (timezone, notifications, account)

### Components
- [ ] PactCard
- [ ] StreakCounter
- [ ] HeatMap (GitHub-style contribution grid)
- [ ] XPBar and LevelBadge
- [ ] ConsequenceTierSelector
- [ ] CheckInButton (time-gated)
- [ ] GraceDayIndicator

### Native Modules
- [ ] iOS Swift module (FamilyControls Screen Time enforcement)
- [ ] Android Kotlin module (UsageStatsManager overlay enforcement)
- [ ] Unified JS interface (`LockModule.enableLock(duration)`)
- [ ] Apply for `com.apple.developer.family-controls` entitlement

---

## Testing

- [ ] Streak calculation unit tests (timezone edge cases, grace days, monthly resets)
- [ ] XP calculation unit tests (multipliers, tier bonuses)
- [ ] Consequence engine unit tests (idempotency, retry, debt state)
- [ ] API integration tests (pact CRUD, check-in, consequence trigger)
- [ ] Razorpay integration tests (mock client)
- [ ] Twitter integration tests (mock client)
- [ ] Mobile E2E tests with Detox (pact creation flow, check-in flow)

---

## Pre-Launch

- [ ] Razorpay production account setup + KYC
- [ ] Twitter/X developer app approval (production keys)
- [ ] Apple FamilyControls entitlement approved
- [ ] App Store listing (screenshots, description, privacy policy)
- [ ] Play Store listing
- [ ] Privacy policy page (required for payment + social login)
- [ ] Terms of service page
- [ ] Load testing on consequence engine (concurrent EOD jobs)
- [ ] Final security review (auth, payment, token storage)

---

## Completed

*(Nothing yet — project is in setup phase)*

---

## Notes

- Razorpay test vs production environments are separate accounts — never mix keys
- FamilyControls entitlement application should be submitted early (Apple review can take weeks)
- Anti-charity NGO list needs legal review before launch — ensure only registered NGOs
