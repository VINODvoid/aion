import { Webhook } from 'svix'

import { Hono } from 'hono'

import { db } from '@aion/db'

// Clerk webhook event shapes — only the fields we actually use
type ClerkUserCreatedEvent = {
  type: 'user.created'
  data: {
    id: string
    first_name: string | null
    last_name: string | null
    email_addresses: Array<{ email_address: string; id: string }>
    primary_email_address_id: string
  }
}

type ClerkUserUpdatedEvent = {
  type: 'user.updated'
  data: {
    id: string
    first_name: string | null
    last_name: string | null
    email_addresses: Array<{ email_address: string; id: string }>
    primary_email_address_id: string
  }
}

type ClerkUserDeletedEvent = {
  type: 'user.deleted'
  data: {
    id: string
    deleted: boolean
  }
}

type ClerkWebhookEvent = ClerkUserCreatedEvent | ClerkUserUpdatedEvent | ClerkUserDeletedEvent

export const clerkWebhook = new Hono()

clerkWebhook.post('/', async (c) => {
  const secret = process.env['CLERK_WEBHOOK_SECRET']
  if (!secret) {
    console.error('CLERK_WEBHOOK_SECRET is not set')
    return c.json({ error: 'Webhook secret not configured' }, 500)
  }

  // Verify the svix signature to ensure the request is genuinely from Clerk.
  // Without this check, anyone could POST fake user events and inject DB records.
  const svixId = c.req.header('svix-id')
  const svixTimestamp = c.req.header('svix-timestamp')
  const svixSignature = c.req.header('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return c.json({ error: 'Missing svix headers' }, 400)
  }

  const body = await c.req.text()

  let event: ClerkWebhookEvent
  try {
    const wh = new Webhook(secret)
    event = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as ClerkWebhookEvent
  } catch {
    // Signature mismatch — reject immediately
    return c.json({ error: 'Invalid signature' }, 400)
  }

  try {
    switch (event.type) {
      case 'user.created':
        await handleUserCreated(event)
        break
      case 'user.updated':
        await handleUserUpdated(event)
        break
      case 'user.deleted':
        await handleUserDeleted(event)
        break
    }
  } catch (err) {
    console.error({ event: event.type, err }, 'Clerk webhook handler failed')
    // Return 500 so Clerk retries the event — do not swallow failures
    return c.json({ error: 'Handler failed' }, 500)
  }

  return c.json({ received: true }, 200)
})

// ─── Event Handlers ───────────────────────────────────────────────────────────

async function handleUserCreated(event: ClerkUserCreatedEvent): Promise<void> {
  const { id: clerkId, first_name, last_name, email_addresses, primary_email_address_id } = event.data

  const primaryEmail = email_addresses.find((e) => e.id === primary_email_address_id)
  if (!primaryEmail) {
    console.warn({ clerkId }, 'user.created event has no primary email — skipping')
    return
  }

  const name = [first_name, last_name].filter(Boolean).join(' ') || 'AION User'

  // Upsert — safe to replay. Clerk may send the event more than once if our
  // previous response timed out. The unique constraint is on clerkId.
  await db.user.upsert({
    where: { clerkId },
    create: {
      clerkId,
      name,
      email: primaryEmail.email_address,
      // Default timezone — user updates this on first app launch from device locale
      timezone: 'UTC',
    },
    update: {}, // already exists — do not overwrite on replay
  })

  console.info({ clerkId }, 'User created from Clerk webhook')
}

async function handleUserUpdated(event: ClerkUserUpdatedEvent): Promise<void> {
  const { id: clerkId, first_name, last_name, email_addresses, primary_email_address_id } = event.data

  const primaryEmail = email_addresses.find((e) => e.id === primary_email_address_id)
  const name = [first_name, last_name].filter(Boolean).join(' ') || undefined

  await db.user.update({
    where: { clerkId },
    data: {
      ...(name && { name }),
      ...(primaryEmail && { email: primaryEmail.email_address }),
    },
  })

  console.info({ clerkId }, 'User updated from Clerk webhook')
}

async function handleUserDeleted(event: ClerkUserDeletedEvent): Promise<void> {
  const { id: clerkId } = event.data

  // Cascade delete — all pacts, check-ins, streaks, consequences owned by this
  // user are deleted via the DB cascade rules defined in the Prisma schema.
  // This is intentional: a deleted Clerk account means full data removal.
  await db.user.delete({
    where: { clerkId },
  })

  console.info({ clerkId }, 'User deleted from Clerk webhook')
}
