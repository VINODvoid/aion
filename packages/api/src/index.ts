import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'

import { authMiddleware } from './middleware/auth'
import { healthRouter } from './routes/health/health-router'
import { userRouter } from './routes/users/user-router'
import { pactRouter } from './routes/pacts/pact-router'
import { checkInRouter } from './routes/check-ins/check-in-router'
import { streakRouter } from './routes/streaks/streak-router'
import { xpRouter } from './routes/xp/xp-router'
import { consequenceRouter } from './routes/consequences/consequence-router'
import { graceDayRouter } from './routes/grace-days/grace-day-router'
import { clerkWebhook } from './webhooks/clerk-webhook'

const app = new Hono()

// Structured request logging for every incoming request
app.use('*', logger())

// CORS applied only to authenticated API routes — webhooks are excluded
// because they are verified by signature, not by origin
app.use('/api/*', cors({
  origin: (process.env['ALLOWED_ORIGINS'] ?? '').split(','),
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}))

// Public routes — no auth required
app.route('/health', healthRouter)
app.route('/webhooks/clerk', clerkWebhook)

// All /api/* routes require a valid Clerk JWT.
// The middleware attaches userId to context for downstream handlers.
app.use('/api/*', authMiddleware)

app.route('/api/users', userRouter)
app.route('/api/pacts', pactRouter)
app.route('/api/check-ins', checkInRouter)
app.route('/api/streaks', streakRouter)
app.route('/api/xp', xpRouter)
app.route('/api/consequences', consequenceRouter)
app.route('/api/grace-days', graceDayRouter)

const port = Number(process.env['PORT'] ?? 3001)

export default {
  port,
  fetch: app.fetch,
}
