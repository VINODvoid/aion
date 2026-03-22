import { Hono } from 'hono'
import { z } from 'zod'

import { db } from '@aion/db'
import { calculateLevel } from '@aion/shared'

type Variables = { userId: string }

export const xpRouter = new Hono<{ Variables: Variables }>()

// GET /api/xp — current XP total, level, and progress to next level
xpRouter.get('/', async (c) => {
  const clerkId = c.get('userId')

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { totalXP: true, level: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  // calculateLevel derives level purely from totalXP — it is the single source of truth.
  // The stored `level` field is kept in sync as a cache but this response always
  // recalculates to ensure mobile UI shows the correct state.
  const levelData = calculateLevel(user.totalXP)

  return c.json({
    totalXP: user.totalXP,
    level: levelData.level,
    currentLevelXP: levelData.currentLevelXP,
    nextLevelXP: levelData.nextLevelXP,
    progressPercent: levelData.progressPercent,
  })
})

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})

// GET /api/xp/history — paginated XP event log
xpRouter.get('/history', async (c) => {
  const clerkId = c.get('userId')

  const result = historyQuerySchema.safeParse(c.req.query())
  if (!result.success) {
    return c.json({ error: 'INVALID_INPUT', message: result.error.message }, 400)
  }

  const { limit, offset } = result.data

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  const [logs, total] = await Promise.all([
    db.xPLog.findMany({
      where: { userId: user.id },
      select: { id: true, amount: true, source: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    db.xPLog.count({ where: { userId: user.id } }),
  ])

  return c.json({
    logs,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  })
})
