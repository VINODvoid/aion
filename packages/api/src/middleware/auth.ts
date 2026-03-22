import { createMiddleware } from 'hono/factory'
import { createClerkClient } from '@clerk/backend'

// Extend Hono's context type so c.get('userId') is typed as string
// in every route handler that sits behind this middleware.
type Variables = { userId: string }

// Single Clerk client instance — reused across all requests.
// Reads CLERK_SECRET_KEY from env at startup.
const clerk = createClerkClient({
  secretKey: process.env['CLERK_SECRET_KEY'],
})

/**
 * Verifies the Clerk session token via authenticateRequest().
 * Passes the raw Request object to Clerk — it handles Bearer token
 * extraction and JWT verification internally.
 * On success, attaches the Clerk user ID to Hono context as `userId`.
 * On failure, returns 401 — the request never reaches the route handler.
 */
export const authMiddleware = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    const requestState = await clerk.authenticateRequest(c.req.raw, {
      secretKey: process.env['CLERK_SECRET_KEY'],
    })

    // status is 'signed-in' only when the token is valid and verified
    if (requestState.status !== 'signed-in') {
      return c.json(
        { error: 'UNAUTHORIZED', message: 'Invalid or expired session token.' },
        401,
      )
    }

    const auth = requestState.toAuth()

    if (!auth?.userId) {
      return c.json({ error: 'UNAUTHORIZED', message: 'Could not resolve user.' }, 401)
    }

    c.set('userId', auth.userId)
    await next()
  },
)
