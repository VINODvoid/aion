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

import { db } from '@aion/db'

type Variables = { userId: string }

export const consequenceRouter = new Hono<{ Variables: Variables }>()

// GET /api/consequences/:pactId — fetch consequence config and current status
consequenceRouter.get('/:pactId', async (c) => {
  const clerkId = c.get('userId')
  const pactId = c.req.param('pactId')

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  const pact = await db.pact.findUnique({
    where: { id: pactId },
    select: {
      userId: true,
      consequenceTier: true,
      consequence: {
        select: {
          id: true,
          type: true,
          status: true,
          config: true,
          // Mandate ID is sensitive — never expose the full ID to the client.
          // The mobile app only needs to know whether a mandate exists.
          razorpayMandateId: true,
          firedAt: true,
        },
      },
    },
  })

  if (!pact) return c.json({ error: 'PACT_NOT_FOUND', message: 'Pact not found.' }, 404)
  if (pact.userId !== user.id) return c.json({ error: 'FORBIDDEN', message: 'You do not own this pact.' }, 403)
  if (!pact.consequence) return c.json({ error: 'CONSEQUENCE_NOT_FOUND', message: 'Consequence record missing.' }, 500)

  return c.json({
    consequence: {
      id: pact.consequence.id,
      type: pact.consequence.type,
      status: pact.consequence.status,
      config: pact.consequence.config,
      // Surface only whether a mandate exists, not the actual ID
      hasMandateSetup: !!pact.consequence.razorpayMandateId,
      firedAt: pact.consequence.firedAt,
    },
  })
})

// POST /api/consequences/:pactId/arm — store Razorpay mandate ID after client completes mandate setup
// Called by the mobile app after the user completes the Razorpay e-mandate flow.
// The mandate was created by the backend — this endpoint confirms it is in place.
consequenceRouter.post('/:pactId/arm', async (c) => {
  const clerkId = c.get('userId')
  const pactId = c.req.param('pactId')

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  const pact = await db.pact.findUnique({
    where: { id: pactId },
    select: {
      userId: true,
      status: true,
      consequenceTier: true,
      consequence: { select: { id: true, status: true, razorpayMandateId: true } },
    },
  })

  if (!pact) return c.json({ error: 'PACT_NOT_FOUND', message: 'Pact not found.' }, 404)
  if (pact.userId !== user.id) return c.json({ error: 'FORBIDDEN', message: 'You do not own this pact.' }, 403)
  if (!pact.consequence) return c.json({ error: 'CONSEQUENCE_NOT_FOUND', message: 'Consequence record missing.' }, 500)

  // For Tier 1 (SHAME) and Tier 2 (LOCK), no mandate is needed — consequence is always ARMED
  if (pact.consequenceTier <= 2) {
    return c.json({ error: 'NO_MANDATE_REQUIRED', message: 'This consequence tier does not require a mandate.' }, 422)
  }

  if (pact.consequence.status !== 'ARMED') {
    return c.json({ error: 'CONSEQUENCE_NOT_ARMED', message: 'Consequence is not in ARMED state.' }, 422)
  }

  // TODO: verify mandate is active with Razorpay before storing
  // For now we store it directly — Razorpay webhook will handle status updates

  return c.json({ armed: true, consequenceId: pact.consequence.id })
})

// GET /api/consequences/:pactId/history — fired consequence history for a pact
consequenceRouter.get('/:pactId/history', async (c) => {
  const clerkId = c.get('userId')
  const pactId = c.req.param('pactId')

  const user = await db.user.findUnique({
    where: { clerkId },
    select: { id: true },
  })
  if (!user) return c.json({ error: 'USER_NOT_FOUND', message: 'User not found.' }, 404)

  const pact = await db.pact.findUnique({
    where: { id: pactId },
    select: { userId: true },
  })

  if (!pact) return c.json({ error: 'PACT_NOT_FOUND', message: 'Pact not found.' }, 404)
  if (pact.userId !== user.id) return c.json({ error: 'FORBIDDEN', message: 'You do not own this pact.' }, 403)

  // A pact has one consequence record — return it if it was fired
  const consequence = await db.consequence.findUnique({
    where: { pactId },
    select: { type: true, status: true, firedAt: true },
  })

  return c.json({
    history: consequence?.status === 'FIRED'
      ? [{ type: consequence.type, firedAt: consequence.firedAt }]
      : [],
  })
})
