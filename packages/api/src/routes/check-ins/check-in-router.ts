/**
 * Check-in routes
 *
 * POST /api/check-ins           — record a check-in for today
 * GET  /api/check-ins/:pactId   — list check-in history for a pact
 *
 * NOTE: Check-ins are time-gated — you can only check in for today.
 * Back-filling past days is intentionally blocked. This is a core
 * product constraint, not a technical limitation.
 */
import { Hono } from 'hono'

export const checkInRouter = new Hono()

// Stub — implementation in upcoming feature branch
checkInRouter.get('/', (c) => c.json({ status: 'ok', route: 'check-ins' }))
