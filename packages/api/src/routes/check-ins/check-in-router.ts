import { Hono } from 'hono'
import { z } from 'zod'

import { db } from '@aion/db'
import { getTodayInTimezone, isYesterday, calculateCheckinXP, STREAK_MULTIPLIERS } from '@aion/shared'

type Variables = { userId: string }

export const checkInRouter = new Hono<{ Variables: Variables }>()

const checkInSchema = z.object({
  pactId: z.string().uuid(),
  proof: z.string().url().optional(),
})

// POST /api/check-ins — record a check-in for today
// Time-gated — only today's date is accepted. Backdating is intentionally blocked.
checkInRouter.post('/', async (c) => {
  const clerkId = c.get('userId')

  const result = checkInSchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.json({ error: 'INVALID_INPUT', message: result.error.message }, 400)
  }

  const { pactId, proof } = result.data

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, timezone: true, totalXP: true, level: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  const pact = await db.pact.findUnique({
    where: { id: pactId },
    select: { id: true, userId: true, status: true, consequenceTier: true },
  })

  if (!pact) return c.json({ error: 'PACT_NOT_FOUND', message: 'Pact not found.' }, 404)
  if (pact.userId !== user.id) return c.json({ error: 'FORBIDDEN', message: 'You do not own this pact.' }, 403)
  if (pact.status !== 'ACTIVE') {
    return c.json({ error: 'PACT_NOT_ACTIVE', message: 'You can only check in on active pacts.' }, 422)
  }

  // Today's date in the user's timezone — this is the canonical date for the check-in.
  // We never use server time because users in different timezones have different "today"s.
  const today = getTodayInTimezone(user.timezone)

  // Enforce the time-gate — one check-in per day, no backdating
  const existing = await db.checkIn.findUnique({
    where: { pactId_date: { pactId, date: today } },
    select: { id: true },
  })
  if (existing) {
    return c.json({ error: 'ALREADY_CHECKED_IN', message: 'Already checked in today.' }, 409)
  }

  // Load current streak to calculate multiplier and XP
  const streak = await db.streak.findUnique({
    where: { pactId },
    select: { currentStreak: true, longestStreak: true, lastCheckInDate: true },
  })
  if (!streak) return c.json({ error: 'STREAK_NOT_FOUND', message: 'Streak record missing.' }, 500)

  // Streak continues only if the last check-in was yesterday in the user's timezone.
  // Any longer gap resets the streak to 1. This is the core accountability mechanic.
  // lastCheckInDate is stored as YYYY-MM-DD — parse it to a Date for comparison
  const newStreak =
    streak.lastCheckInDate && isYesterday(new Date(streak.lastCheckInDate), user.timezone)
      ? streak.currentStreak + 1
      : 1

  const newLongest = Math.max(newStreak, streak.longestStreak)

  // Multiplier resets when a streak resets, scales up at 7 and 30 day milestones
  let newMultiplier: number = STREAK_MULTIPLIERS.DEFAULT
  if (newStreak >= 30) newMultiplier = STREAK_MULTIPLIERS.MONTH
  else if (newStreak >= 7) newMultiplier = STREAK_MULTIPLIERS.WEEK

  const xpEarned = calculateCheckinXP(newStreak)
  const newTotalXP = user.totalXP + xpEarned

  // All mutations in a single transaction — check-in, streak, XP must all succeed or all fail
  const checkIn = await db.$transaction(async (tx) => {
    const newCheckIn = await tx.checkIn.create({
      data: { pactId, userId: user.id, date: today, proof, xpEarned },
      select: { id: true, pactId: true, date: true, proof: true, xpEarned: true, createdAt: true },
    })

    await tx.streak.update({
      where: { pactId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        multiplier: newMultiplier,
        lastCheckInDate: today,
      },
    })

    await tx.user.update({
      where: { id: user.id },
      data: { totalXP: newTotalXP },
    })

    await tx.xPLog.create({
      data: { userId: user.id, amount: xpEarned, source: 'CHECKIN' },
    })

    return newCheckIn
  })

  return c.json(
    {
      checkIn,
      streak: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        multiplier: newMultiplier,
      },
      xp: {
        earned: xpEarned,
        total: newTotalXP,
      },
    },
    201,
  )
})

// GET /api/check-ins/:pactId — list check-in history for a pact
checkInRouter.get('/:pactId', async (c) => {
  const clerkId = c.get('userId')
  const pactId = c.req.param('pactId')

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  const pact = await db.pact.findUnique({
    where: { id: pactId },
    select: { userId: true },
  })
  if (!pact) return c.json({ error: 'PACT_NOT_FOUND', message: 'Pact not found.' }, 404)
  if (pact.userId !== user.id) return c.json({ error: 'FORBIDDEN', message: 'You do not own this pact.' }, 403)

  const checkIns = await db.checkIn.findMany({
    where: { pactId },
    select: { id: true, date: true, proof: true, xpEarned: true, createdAt: true },
    orderBy: { date: 'desc' },
  })

  return c.json({ checkIns })
})
