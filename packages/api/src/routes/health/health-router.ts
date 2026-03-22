/**
 * Health routes
 *
 * GET /health       — liveness probe; returns 200 if the process is running
 * GET /health/ready — readiness probe; checks DB + Redis connectivity (TODO)
 *
 * Used by the deployment platform to determine if the instance should
 * receive traffic. Must always be public — no auth middleware applied.
 */
import { Hono } from 'hono'

export const healthRouter = new Hono()

healthRouter.get('/', (c) => c.json({ status: 'ok', service: 'aion-api' }))
