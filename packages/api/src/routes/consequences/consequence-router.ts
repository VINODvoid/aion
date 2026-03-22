/**
 * Consequence routes
 *
 * GET  /api/consequences/:pactId         — fetch consequence config and current status
 * POST /api/consequences/:pactId/arm     — arm the consequence after Razorpay mandate is confirmed
 * GET  /api/consequences/:pactId/history — list all fired consequences for a pact
 *
 * CRITICAL: Consequences are NEVER triggered from the client.
 * Firing is handled exclusively by BullMQ workers in packages/queue.
 * Any attempt to trigger a consequence from the mobile app must be rejected.
 */
import { Hono } from 'hono'

export const consequenceRouter = new Hono()

// Stub — implementation in upcoming feature branch
consequenceRouter.get('/', (c) => c.json({ status: 'ok', route: 'consequences' }))
