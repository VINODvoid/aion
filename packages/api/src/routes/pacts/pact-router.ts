/**
 * Pact routes
 *
 * GET    /api/pacts      — list all pacts for the authenticated user
 * POST   /api/pacts      — create a new pact with consequence config
 * GET    /api/pacts/:id  — fetch a single pact by ID
 * PATCH  /api/pacts/:id  — update allowed fields (name, description) — consequence tier is immutable
 * DELETE /api/pacts/:id  — cancel/archive a pact
 *
 * NOTE: Consequence tier cannot be changed after creation.
 * This is enforced at the service layer, not just validation.
 */
import { Hono } from 'hono'

export const pactRouter = new Hono()

// Stub — implementation in upcoming feature branch
pactRouter.get('/', (c) => c.json({ status: 'ok', route: 'pacts' }))
