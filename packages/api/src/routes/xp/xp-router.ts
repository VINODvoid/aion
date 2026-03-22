/**
 * XP / leveling routes
 *
 * GET /api/xp          — current XP total, level, and progress to next level
 * GET /api/xp/history  — paginated XP event log (source, amount, date)
 */
import { Hono } from 'hono'

export const xpRouter = new Hono()

// Stub — implementation in upcoming feature branch
xpRouter.get('/', (c) => c.json({ status: 'ok', route: 'xp' }))
