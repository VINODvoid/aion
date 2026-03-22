/**
 * Grace day routes
 *
 * GET  /api/grace-days/:pactId      — remaining grace days for the current month
 * POST /api/grace-days/:pactId/use  — consume a grace day for today
 *
 * Grace days do not roll over — they reset on the 1st of each month.
 * This is intentional: grace days are an emergency valve, not a strategic resource.
 */
import { Hono } from 'hono'
import { z } from 'zod'

import { db } from '@aion/db'
import { getTodayInTimezone } from '@aion/shared'

type Variables = { userId: string }

export const graceDayRouter = new Hono<{ Variables: Variables }>()

// GET /api/grace-days/:pactId — grace day summary for this month
graceDayRouter.get('/:pactId', async (c) => {
  const clerkId = c.get('userId')
  const pactId = c.req.param('pactId')

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, timezone: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  const pact = await db.pact.findUnique({
    where: { id: pactId },
    select: { userId: true, graceDaysAllowed: true, graceDaysUsed: true },
  })

  if (!pact) return c.json({ error: 'PACT_NOT_FOUND', message: 'Pact not found.' }, 404)
  if (pact.userId !== user.id) return c.json({ error: 'FORBIDDEN', message: 'You do not own this pact.' }, 403)

  const today = getTodayInTimezone(user.timezone)

  // Count grace days used THIS month only — they reset on the 1st
  // The date is YYYY-MM-DD so we match the YYYY-MM prefix
  const currentMonth = today.slice(0, 7) // "YYYY-MM"
  const usedThisMonth = await db.graceDay.count({
    where: {
      pactId,
      date: { startsWith: currentMonth },
    },
  })

  return c.json({
    graceDays: {
      allowed: pact.graceDaysAllowed,
      usedThisMonth,
      remainingThisMonth: Math.max(0, pact.graceDaysAllowed - usedThisMonth),
    },
  })
})

const useGraceDaySchema = z.object({
  reason: z.string().max(200).optional(),
})

// POST /api/grace-days/:pactId/use — consume a grace day for today
// Grace day deduction and the GraceDay log record are written in the same
// transaction — prevents partial state if either write fails.
graceDayRouter.post('/:pactId/use', async (c) => {
  const clerkId = c.get('userId')
  const pactId = c.req.param('pactId')

  const result = useGraceDaySchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.json({ error: 'INVALID_INPUT', message: result.error.message }, 400)
  }

  const { reason } = result.data

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, timezone: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  const pact = await db.pact.findUnique({
    where: { id: pactId },
    select: { userId: true, status: true, graceDaysAllowed: true },
  })

  if (!pact) return c.json({ error: 'PACT_NOT_FOUND', message: 'Pact not found.' }, 404)
  if (pact.userId !== user.id) return c.json({ error: 'FORBIDDEN', message: 'You do not own this pact.' }, 403)
  if (pact.status !== 'ACTIVE') {
    return c.json({ error: 'PACT_NOT_ACTIVE', message: 'Grace days can only be used on active pacts.' }, 422)
  }

  const today = getTodayInTimezone(user.timezone)
  const currentMonth = today.slice(0, 7)

  // Verify there is no check-in today — grace days are for missed days only
  const checkedInToday = await db.checkIn.findUnique({
    where: { pactId_date: { pactId, date: today } },
    select: { id: true },
  })
  if (checkedInToday) {
    return c.json({ error: 'ALREADY_CHECKED_IN', message: 'You already checked in today.' }, 409)
  }

  // Verify grace day not already used today
  const alreadyUsedToday = await db.graceDay.findUnique({
    where: { pactId_date: { pactId, date: today } },
    select: { id: true },
  })
  if (alreadyUsedToday) {
    return c.json({ error: 'GRACE_DAY_ALREADY_USED', message: 'Grace day already used today.' }, 409)
  }

  // Count grace days used this month to enforce the monthly limit
  const usedThisMonth = await db.graceDay.count({
    where: { pactId, date: { startsWith: currentMonth } },
  })

  if (usedThisMonth >= pact.graceDaysAllowed) {
    return c.json(
      { error: 'NO_GRACE_DAYS_REMAINING', message: 'No grace days remaining this month.' },
      422,
    )
  }

  // Atomic write — both the log record and the counter must succeed together
  const [graceDay] = await db.$transaction([
    db.graceDay.create({
      data: { pactId, date: today, reason },
      select: { id: true, date: true, reason: true },
    }),
    db.pact.update({
      where: { id: pactId },
      data: { graceDaysUsed: { increment: 1 } },
    }),
  ])

  return c.json(
    {
      graceDay,
      remainingThisMonth: pact.graceDaysAllowed - usedThisMonth - 1,
    },
    201,
  )
})
