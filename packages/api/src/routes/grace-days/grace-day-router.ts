/**
 * Grace day routes
 *
 * GET  /api/grace-days/:pactId      — remaining grace days for the current month
 * POST /api/grace-days/:pactId/use  — consume a grace day for a missed check-in
 *
 * NOTE: Grace day deduction and the missed-check-in record must happen
 * in the same DB transaction to prevent partial state (deducted but not logged).
 * Grace days do not roll over — they reset on the 1st of each month.
 */
import { Hono } from 'hono'

export const graceDayRouter = new Hono()

// Stub — implementation in upcoming feature branch
graceDayRouter.get('/', (c) => c.json({ status: 'ok', route: 'grace-days' }))
