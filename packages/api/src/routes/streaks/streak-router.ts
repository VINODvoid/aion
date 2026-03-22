/**
 * Streak routes
 *
 * GET /api/streaks/:pactId  — current streak, longest streak, multiplier, grace days remaining
 *
 * NOTE: All streak calculations are timezone-aware using the user's
 * stored timezone. Never compare dates using server timezone.
 */
import { Hono } from 'hono'

export const streakRouter = new Hono()

// Stub — implementation in upcoming feature branch
streakRouter.get('/', (c) => c.json({ status: 'ok', route: 'streaks' }))
