import { Hono } from 'hono'
import { z } from 'zod'

import type { Prisma } from '@aion/db'
import { db } from '@aion/db'
import { MAX_ACTIVE_PACTS, MIN_PACT_DURATION_DAYS } from '@aion/shared'

type Variables = { userId: string }

export const pactRouter = new Hono<{ Variables: Variables }>()

// Maps consequenceTier integer to the ConsequenceType enum value in the DB
const TIER_TO_TYPE = {
  1: 'SHAME',
  2: 'LOCK',
  3: 'FINANCIAL',
  4: 'NUCLEAR',
} as const

const createPactSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  frequency: z.union([z.literal('DAILY'), z.literal('WEEKLY')]),
  // Required only when frequency is WEEKLY — e.g. 3 means "3 times per week"
  weeklyTarget: z.number().int().min(1).max(7).optional(),
  consequenceTier: z.number().int().min(1).max(4),
  graceDaysAllowed: z.number().int().min(0).max(2),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  // Consequence config — structure varies by tier, validated loosely here
  // Tier 1: { shameTemplate: string }
  // Tier 2: { lockDurationMinutes: number }
  // Tier 3: { amountINR: number, ngoId: string }
  // Tier 4: all of the above combined
  consequenceConfig: z.record(z.string(), z.unknown()),
})

const updatePactSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  // Consequence tier is intentionally excluded — it cannot be changed after creation
})

// GET /api/pacts — list all pacts for the authenticated user
pactRouter.get('/', async (c) => {
  const clerkId = c.get('userId')

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  const pacts = await db.pact.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      description: true,
      frequency: true,
      weeklyTarget: true,
      consequenceTier: true,
      graceDaysAllowed: true,
      graceDaysUsed: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true,
      streak: {
        select: { currentStreak: true, longestStreak: true, multiplier: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return c.json({ pacts })
})

// POST /api/pacts — create a new pact
pactRouter.post('/', async (c) => {
  const clerkId = c.get('userId')

  const result = createPactSchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.json({ error: 'INVALID_INPUT', message: result.error.message }, 400)
  }

  const { name, description, frequency, weeklyTarget, consequenceTier, graceDaysAllowed, startDate, endDate, consequenceConfig } = result.data

  if (frequency === 'WEEKLY' && !weeklyTarget) {
    return c.json({ error: 'INVALID_INPUT', message: 'weeklyTarget is required for WEEKLY pacts.' }, 400)
  }

  // Validate minimum pact duration when endDate is provided
  if (endDate) {
    const durationDays = Math.ceil(
      (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24),
    )
    if (durationDays < MIN_PACT_DURATION_DAYS) {
      return c.json(
        { error: 'INVALID_INPUT', message: `Pact must be at least ${MIN_PACT_DURATION_DAYS} days long.` },
        400,
      )
    }
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, _count: { select: { pacts: { where: { status: 'ACTIVE' } } } } },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  // Enforce active pact limit — prevents users from spreading accountability too thin
  if (user._count.pacts >= MAX_ACTIVE_PACTS) {
    return c.json(
      { error: 'PACT_LIMIT_REACHED', message: `You can have at most ${MAX_ACTIVE_PACTS} active pacts.` },
      422,
    )
  }

  const consequenceType = TIER_TO_TYPE[consequenceTier as keyof typeof TIER_TO_TYPE]

  // Create pact, streak, and consequence in a single transaction.
  // All three must exist together — a pact without a streak or consequence
  // record is an invalid state that would break the EOD scheduler.
  const pact = await db.$transaction(async (tx) => {
    const newPact = await tx.pact.create({
      data: {
        userId: user.id,
        name,
        description,
        frequency,
        weeklyTarget,
        consequenceTier,
        graceDaysAllowed,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
    })

    await tx.streak.create({
      data: { pactId: newPact.id },
    })

    await tx.consequence.create({
      data: {
        pactId: newPact.id,
        type: consequenceType,
        // Cast required — Prisma's Json type does not accept Record<string, unknown>
        // directly due to unknown values. The data is user-supplied and validated upstream.
        config: consequenceConfig as Prisma.InputJsonValue,
      },
    })

    return newPact
  })

  return c.json({ pact }, 201)
})

// GET /api/pacts/:id — fetch a single pact with streak and consequence
pactRouter.get('/:id', async (c) => {
  const clerkId = c.get('userId')
  const pactId = c.req.param('id')

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  const pact = await db.pact.findUnique({
    where: { id: pactId },
    select: {
      id: true,
      userId: true,
      name: true,
      description: true,
      frequency: true,
      weeklyTarget: true,
      consequenceTier: true,
      graceDaysAllowed: true,
      graceDaysUsed: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true,
      streak: {
        select: {
          currentStreak: true,
          longestStreak: true,
          multiplier: true,
          lastCheckInDate: true,
        },
      },
      consequence: {
        select: { type: true, status: true, config: true, firedAt: true },
      },
    },
  })

  if (!pact) return c.json({ error: 'PACT_NOT_FOUND', message: 'Pact not found.' }, 404)

  // Prevent users from reading other users' pacts
  if (pact.userId !== user.id) {
    return c.json({ error: 'FORBIDDEN', message: 'You do not own this pact.' }, 403)
  }

  return c.json({ pact })
})

// PATCH /api/pacts/:id — update name or description only
// Consequence tier is immutable — excluded from this schema intentionally
pactRouter.patch('/:id', async (c) => {
  const clerkId = c.get('userId')
  const pactId = c.req.param('id')

  const result = updatePactSchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.json({ error: 'INVALID_INPUT', message: result.error.message }, 400)
  }

  if (Object.keys(result.data).length === 0) {
    return c.json({ error: 'INVALID_INPUT', message: 'No fields to update.' }, 400)
  }

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  const existing = await db.pact.findUnique({
    where: { id: pactId },
    select: { userId: true, status: true },
  })

  if (!existing) return c.json({ error: 'PACT_NOT_FOUND', message: 'Pact not found.' }, 404)
  if (existing.userId !== user.id) return c.json({ error: 'FORBIDDEN', message: 'You do not own this pact.' }, 403)
  if (existing.status !== 'ACTIVE') {
    return c.json({ error: 'PACT_NOT_ACTIVE', message: 'Only active pacts can be updated.' }, 422)
  }

  const pact = await db.pact.update({
    where: { id: pactId },
    data: result.data,
    select: { id: true, name: true, description: true, status: true },
  })

  return c.json({ pact })
})

// DELETE /api/pacts/:id — cancel a pact (sets status to FAILED)
pactRouter.delete('/:id', async (c) => {
  const clerkId = c.get('userId')
  const pactId = c.req.param('id')

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  const existing = await db.pact.findUnique({
    where: { id: pactId },
    select: { userId: true, status: true },
  })

  if (!existing) return c.json({ error: 'PACT_NOT_FOUND', message: 'Pact not found.' }, 404)
  if (existing.userId !== user.id) return c.json({ error: 'FORBIDDEN', message: 'You do not own this pact.' }, 403)

  // Disarm the consequence before cancelling — the pact is being abandoned,
  // not failed. We do not fire consequences on manual cancellation.
  await db.$transaction([
    db.consequence.updateMany({
      where: { pactId, status: 'ARMED' },
      data: { status: 'DISARMED' },
    }),
    db.pact.update({
      where: { id: pactId },
      data: { status: 'FAILED' },
    }),
  ])

  return c.json({ cancelled: true })
})
