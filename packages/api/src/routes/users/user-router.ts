/**
 * User routes
 *
 * GET    /api/users/me  — fetch the authenticated user's profile (XP, level, timezone)
 * PATCH  /api/users/me  — update profile fields (name, timezone)
 * DELETE /api/users/me  — soft-delete account, cancel active pacts, disarm consequences
 */
import { Hono } from 'hono'

export const userRouter = new Hono()

// Stub — implementation in upcoming feature branch
userRouter.get('/', (c) => c.json({ status: 'ok', route: 'users' }))
