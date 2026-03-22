import { Hono } from 'hono'

import { db } from '@aion/db'
import { getTodayInTimezone } from '@aion/shared'

type Variables = { userId: string }

export const streakRouter = new Hono<{ Variables: Variables }>()

// GET /api/streaks/:pactId — current streak, longest streak, multiplier, grace days
streakRouter.get('/:pactId', async (c) => {
  const clerkId = c.get('userId')
  const pactId = c.req.param('pactId')

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true, timezone: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  const pact = await db.pact.findUnique({
    where: { id: pactId },
    select: {
      userId: true,
      graceDaysAllowed: true,
      graceDaysUsed: true,
      streak: {
        select: {
          currentStreak: true,
          longestStreak: true,
          multiplier: true,
          lastCheckInDate: true,
        },
      },
    },
  })

  if (!pact) return c.json({ error: 'PACT_NOT_FOUND', message: 'Pact not found.' }, 404)
  if (pact.userId !== user.id) return c.json({ error: 'FORBIDDEN', message: 'You do not own this pact.' }, 403)
  if (!pact.streak) return c.json({ error: 'STREAK_NOT_FOUND', message: 'Streak record missing.' }, 500)

  const today = getTodayInTimezone(user.timezone)

  // Has the user already checked in today?
  const checkedInToday = await db.checkIn.findUnique({
    where: { pactId_date: { pactId, date: today } },
    select: { id: true },
  })

  return c.json({
    streak: {
      currentStreak: pact.streak.currentStreak,
      longestStreak: pact.streak.longestStreak,
      multiplier: pact.streak.multiplier,
      lastCheckInDate: pact.streak.lastCheckInDate,
      checkedInToday: !!checkedInToday,
    },
    graceDays: {
      allowed: pact.graceDaysAllowed,
      used: pact.graceDaysUsed,
      remaining: pact.graceDaysAllowed - pact.graceDaysUsed,
    },
  })
})
