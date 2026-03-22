/**
 * Clerk webhook handler
 *
 * Clerk POSTs user lifecycle events to /webhooks/clerk.
 *
 * SECURITY — verify the svix signature before processing:
 *   Use the svix package with CLERK_WEBHOOK_SECRET to verify
 *   svix-id, svix-timestamp, and svix-signature headers.
 *   Reject with 400 on verification failure.
 *
 * Events to handle (all handlers must be idempotent):
 *   - user.created → create User row in DB (upsert to handle replays)
 *   - user.updated → sync name/email changes to DB
 *   - user.deleted → soft-delete User, cancel active pacts
 */
import { Hono } from 'hono'

export const clerkWebhook = new Hono()

clerkWebhook.post('/', async (c) => {
  // TODO: implement svix signature verification
  // TODO: implement event routing
  return c.json({ received: true }, 200)
})
