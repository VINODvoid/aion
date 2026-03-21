---
name: AION Code Conventions
description: Naming, file structure, TypeScript patterns, comments, and code style for AION
type: project
---

# Code Conventions

## TypeScript

- **Strict mode always** — `tsconfig.json` must have `"strict": true` across all packages
- **Explicit return types** on all exported functions — never rely on inference for public APIs
- **No `any`** — use `unknown` and narrow it, or use a proper type. `any` is a code review failure
- **Prefer `type` over `interface`** for data shapes. Use `interface` only when you need declaration merging
- **Enums as const objects** — use `as const` objects instead of TypeScript enums for better tree-shaking:
  ```ts
  // Correct
  export const ConsequenceTier = { SHAME: 1, LOCK: 2, FINANCIAL: 3, NUCLEAR: 4 } as const
  export type ConsequenceTier = typeof ConsequenceTier[keyof typeof ConsequenceTier]

  // Avoid
  enum ConsequenceTier { SHAME = 1, LOCK = 2, FINANCIAL = 3, NUCLEAR = 4 }
  ```
- **Zod for all external input validation** — API request bodies, webhook payloads, env vars

---

## Naming

| Thing | Convention | Example |
|---|---|---|
| Files | kebab-case | `consequence-worker.ts`, `pact-router.ts` |
| React components (files) | PascalCase | `PactCard.tsx`, `HeatMap.tsx` |
| Variables, functions | camelCase | `currentStreak`, `fireConsequence()` |
| Types and interfaces | PascalCase | `PactWithStreak`, `ConsequenceJob` |
| Constants (module-level) | SCREAMING_SNAKE_CASE | `MAX_GRACE_DAYS`, `BASE_CHECKIN_XP` |
| Prisma models | PascalCase (follows Prisma convention) | `User`, `Pact`, `CheckIn` |
| Database columns | camelCase (Prisma maps to snake_case) | `consequenceTier`, `graceDaysUsed` |
| BullMQ queue names | kebab-case string | `'consequence-execution'`, `'push-notification'` |
| Environment variables | SCREAMING_SNAKE_CASE | `RAZORPAY_KEY_SECRET` |
| Expo public env vars | `EXPO_PUBLIC_` prefix | `EXPO_PUBLIC_API_URL` |

---

## File Organization

### One export per file (for components and workers)
Each React component or BullMQ worker lives in its own file. Avoid barrel files (`index.ts`) that
re-export everything — they make tree-shaking harder and imports ambiguous.

### Co-locate tests with source
```
consequence-worker.ts
consequence-worker.test.ts    ← test lives next to the file it tests
```

### Group by feature, not by type (in the API)
```
# Correct
src/routes/pacts/
  pact-router.ts
  pact-service.ts
  pact-types.ts

# Avoid
src/routes/pact-router.ts
src/services/pact-service.ts
src/types/pact-types.ts
```

---

## Import Order

Enforce with ESLint `import/order`. Order:
1. Node built-ins (`node:path`, `node:crypto`)
2. External packages (`hono`, `@prisma/client`, `bullmq`)
3. Internal monorepo packages (`@aion/shared`, `@aion/db`)
4. Relative imports (`./pact-service`, `../utils/timezone`)

Separate each group with a blank line:
```ts
import { readFile } from 'node:fs/promises'

import { Hono } from 'hono'
import { z } from 'zod'

import { db } from '@aion/db'
import { ConsequenceTier } from '@aion/shared'

import { fireShamePost } from './shame-service'
import { calculateXP } from '../utils/xp'
```

---

## Comments

Write comments that explain **why**, not **what**. The code already shows what.

```ts
// Correct — explains why
// Grace days reset monthly but do NOT roll over. A user cannot bank grace days as a safety net.
// This is intentional: grace days are an emergency valve, not a strategic resource.
const graceDaysThisMonth = Math.min(pact.graceDaysAllowed, GRACE_DAYS_PER_MONTH)

// Avoid — describes what (the code already says this)
// Check if grace days is less than allowed
const graceDaysThisMonth = Math.min(pact.graceDaysAllowed, GRACE_DAYS_PER_MONTH)
```

**Always comment:**
- Non-obvious business rules (especially pact/consequence/streak logic)
- Security decisions ("we verify the signature before processing to prevent spoofed webhooks")
- Workarounds or temporary decisions ("TODO: replace with native module once FamilyControls entitlement is approved")
- Edge cases that took time to figure out

**Never comment:**
- What a variable or function name already makes clear
- Boilerplate or framework usage that any dev would recognize

---

## Error Handling

### In API route handlers — always return structured errors
```ts
// All API errors follow this shape
type ApiError = {
  error: string    // machine-readable code, e.g. 'PACT_NOT_FOUND'
  message: string  // human-readable description
  statusCode: number
}
```

### In queue workers — use structured logging, then throw
Workers have BullMQ's retry mechanism. Throw errors to trigger retries. Log before throwing.
```ts
// In a consequence worker
logger.error({ jobId: job.id, pactId, error: err.message }, 'Consequence execution failed')
throw err  // BullMQ will retry based on the job's retry config
```

### Never swallow errors silently
```ts
// Forbidden
try {
  await fireConsequence(pact)
} catch (err) {
  // nothing here — this masks failures and is a critical bug for the consequence engine
}

// Correct
try {
  await fireConsequence(pact)
} catch (err) {
  logger.error({ pactId: pact.id, err }, 'Failed to fire consequence')
  throw err
}
```

---

## React Native Patterns

### State management — Zustand
Use Zustand for global client state. Keep stores small and focused (one store per domain):
- `usePactStore` — active pacts, loading state
- `useUserStore` — user profile, XP, level
- `useStreakStore` — streak data per pact

### Data fetching — TanStack Query
All API calls go through TanStack Query hooks. No raw `fetch` calls in components.
```ts
// Correct
const { data: pacts } = useQuery({ queryKey: ['pacts'], queryFn: fetchActivePacts })

// Avoid
const [pacts, setPacts] = useState([])
useEffect(() => { fetch('/api/pacts').then(...) }, [])
```

### Sensitive storage
- Use `expo-secure-store` for tokens, OAuth credentials
- Never use `AsyncStorage` for anything sensitive
- Never store Razorpay mandate IDs or Twitter tokens on the device

---

## Prisma Patterns

### Always select specific fields — never `findMany` without `select`
```ts
// Correct — only fetch what you need
const pact = await db.pact.findUnique({
  where: { id: pactId },
  select: { id: true, name: true, consequenceTier: true, status: true }
})

// Avoid — fetches all columns including fields you don't need
const pact = await db.pact.findUnique({ where: { id: pactId } })
```

### Transactions for operations that must be atomic
```ts
// Grace day deduction and missed-check-in log must happen together
await db.$transaction([
  db.pact.update({ where: { id }, data: { graceDaysUsed: { increment: 1 } } }),
  db.graceDay.create({ data: { pactId: id, date: today } })
])
```

---

## API Route Patterns (Hono)

### Validate all request bodies with Zod before touching them
```ts
const createPactSchema = z.object({
  name: z.string().min(1).max(100),
  frequency: z.enum(['DAILY', 'WEEKLY']),
  consequenceTier: z.number().int().min(1).max(4),
  // ...
})

app.post('/pacts', async (c) => {
  const result = createPactSchema.safeParse(await c.req.json())
  if (!result.success) return c.json({ error: 'INVALID_INPUT', message: result.error.message }, 400)
  // proceed with result.data
})
```

### Auth middleware runs on every route except public health check
```ts
// packages/api/src/middleware/auth.ts
// Verifies Clerk JWT and attaches userId to context
app.use('/*', clerkAuthMiddleware)
app.get('/health', (c) => c.json({ status: 'ok' }))  // exempt from auth
```
