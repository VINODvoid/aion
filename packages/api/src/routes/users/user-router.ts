import { Hono } from 'hono'
import { z } from 'zod'

import { db } from '@aion/db'

type Variables = { userId: string }

export const userRouter = new Hono<{ Variables: Variables }>()

// GET /api/users/me — fetch authenticated user's full profile
userRouter.get('/me', async (c) => {
  const clerkId = c.get('userId')

  const user = await db.user.findUnique({
    where: { clerkId },
    select: {
      id: true,
      clerkId: true,
      name: true,
      email: true,
      level: true,
      totalXP: true,
      timezone: true,
      createdAt: true,
    },
  })

  if (!user) {
    return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)
  }

  return c.json({ user })
})

const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  // IANA timezone string e.g. "Asia/Kolkata" — validated loosely here,
  // the EOD scheduler relies on this being a valid timezone
  timezone: z.string().min(1).max(50).optional(),
})

// PATCH /api/users/me — update name or timezone
userRouter.patch('/me', async (c) => {
  const clerkId = c.get('userId')

  const result = updateUserSchema.safeParse(await c.req.json())
  if (!result.success) {
    return c.json({ error: 'INVALID_INPUT', message: result.error.message }, 400)
  }

  if (Object.keys(result.data).length === 0) {
    return c.json({ error: 'INVALID_INPUT', message: 'No fields to update.' }, 400)
  }

  const user = await db.user.update({
    where: { clerkId },
    data: result.data,
    select: {
      id: true,
      name: true,
      email: true,
      level: true,
      totalXP: true,
      timezone: true,
    },
  })

  return c.json({ user })
})

// DELETE /api/users/me — delete account
// DB cascade removes all pacts, check-ins, streaks, consequences, grace days, XP logs
userRouter.delete('/me', async (c) => {
  const clerkId = c.get('userId')

  await db.user.delete({ where: { clerkId } })

  return c.json({ deleted: true })
})
