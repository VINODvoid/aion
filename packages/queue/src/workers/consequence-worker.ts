import { Worker, type Job } from 'bullmq'

import { db } from '@aion/db'

import { redis } from '../clients/redis-client'
import { CONSEQUENCE_QUEUE_NAME, type ConsequenceJobData } from '../jobs/consequence-job'

// ─── Config Types ─────────────────────────────────────────────────────────────

type ShameConfig = { shameTemplate: string }
type LockConfig = { lockDurationMinutes: number }
type FinancialConfig = { amountINR: number; ngoId: string }
type NuclearConfig = ShameConfig & LockConfig & FinancialConfig

// ─── Job Processor ────────────────────────────────────────────────────────────

async function processConsequenceJob(job: Job<ConsequenceJobData>): Promise<void> {
  const { pactId, userId, consequenceId } = job.data

  // Load consequence and verify it is still ARMED before executing.
  // This is the idempotency guard — BullMQ may retry a job after a partial failure,
  // and we must never re-fire a consequence that already executed.
  const consequence = await db.consequence.findUnique({
    where: { id: consequenceId },
    select: {
      id: true,
      status: true,
      type: true,
      config: true,
      razorpayMandateId: true,
      pactId: true,
    },
  })

  if (!consequence) {
    // Pact was cancelled and cascade-deleted the consequence — discard safely
    console.warn({ jobId: job.id, consequenceId }, 'Consequence not found — discarding job')
    return
  }

  if (consequence.status !== 'ARMED') {
    console.warn(
      { jobId: job.id, consequenceId, status: consequence.status },
      'Consequence is not ARMED — discarding job (idempotency guard)',
    )
    return
  }

  console.info({ jobId: job.id, consequenceId, type: consequence.type }, 'Executing consequence')

  // Execute the appropriate tier — throws on failure, which triggers BullMQ retry
  await executeByTier(consequence, userId, job.id ?? 'unknown')

  // Mark as FIRED — this is the atomic commit point.
  // If we crash between executing the consequence and this update, BullMQ will retry
  // and the idempotency guard above will discard it (consequence already fired externally).
  // For financial consequences this could theoretically double-charge — Razorpay mandate
  // execution must be checked server-side before charging to prevent this.
  await db.consequence.update({
    where: { id: consequenceId },
    data: { status: 'FIRED', firedAt: new Date() },
  })

  console.info({ jobId: job.id, consequenceId, pactId }, 'Consequence fired successfully')
}

// ─── Tier Execution ───────────────────────────────────────────────────────────

async function executeByTier(
  consequence: { id: string; type: string; config: unknown; razorpayMandateId: string | null },
  userId: string,
  jobId: string,
): Promise<void> {
  const config = consequence.config as Record<string, unknown>

  switch (consequence.type) {
    case 'SHAME':
      await executeShame(config as ShameConfig, userId, jobId)
      break

    case 'LOCK':
      await executeLock(config as LockConfig, userId, jobId)
      break

    case 'FINANCIAL':
      await executeFinancial(config as FinancialConfig, consequence.razorpayMandateId, jobId)
      break

    case 'NUCLEAR':
      // Tier 4 fires all three in parallel — all must succeed.
      // If any fails, the whole job fails and BullMQ retries.
      await Promise.all([
        executeShame(config as NuclearConfig, userId, jobId),
        executeLock(config as NuclearConfig, userId, jobId),
        executeFinancial(config as NuclearConfig, consequence.razorpayMandateId, jobId),
      ])
      break

    default:
      throw new Error(`Unknown consequence type: ${consequence.type}`)
  }
}

// ─── Tier 1: Shame Post ───────────────────────────────────────────────────────

async function executeShame(config: ShameConfig, userId: string, jobId: string): Promise<void> {
  // Load user's Twitter/X OAuth2 tokens — stored encrypted in DB
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { twitterTokens: true },
  })

  if (!user?.twitterTokens) {
    // User never connected Twitter — log and skip rather than failing the job.
    // A missing connection means the shame post was never possible.
    console.warn({ jobId, userId }, 'No Twitter tokens — shame post skipped')
    return
  }

  const tokens = user.twitterTokens as { accessToken: string; refreshToken: string }

  // TODO: implement Twitter/X OAuth2 API call
  // POST https://api.twitter.com/2/tweets
  // Authorization: Bearer <tokens.accessToken>
  // Body: { text: config.shameTemplate }
  // Handle 401 → refresh token and retry once
  // Handle token refresh failure → log, skip (do not block other consequence tiers)
  console.info({ jobId, userId }, 'Shame post executed (stub)')
  void tokens // suppress unused warning until implementation
}

// ─── Tier 2: Phone Lock ───────────────────────────────────────────────────────

async function executeLock(config: LockConfig, userId: string, jobId: string): Promise<void> {
  // TODO: look up user's Expo push token from device registration table
  // (device push tokens require a DeviceToken model — to be added in the push notification branch)
  //
  // Send push notification with lock payload:
  // POST https://exp.host/--/api/v2/push/send
  // Body: {
  //   to: "<expo-push-token>",
  //   title: "CONSEQUENCE ACTIVATED",
  //   data: { type: "LOCK", lockDurationMinutes: config.lockDurationMinutes }
  // }
  // The mobile app's notification handler picks up the "LOCK" type and calls
  // LockModule.enableLock(config.lockDurationMinutes) via the native module.
  console.info({ jobId, userId, lockDurationMinutes: config.lockDurationMinutes }, 'Lock notification sent (stub)')
}

// ─── Tier 3: Financial Charge ─────────────────────────────────────────────────

async function executeFinancial(
  config: FinancialConfig,
  razorpayMandateId: string | null,
  jobId: string,
): Promise<void> {
  if (!razorpayMandateId) {
    // Mandate was never set up — cannot charge. Mark as DEBT instead of failing.
    // This can happen if the user skipped the mandate flow during pact creation.
    throw new Error('No Razorpay mandate ID — financial consequence cannot execute')
  }

  // TODO: implement Razorpay mandate execution
  // 1. Verify mandate is still active: GET /v1/payments/recurring/:mandateId
  // 2. If mandate active: create payment: POST /v1/payments/create/recurring
  //    Body: { mandateId, amount: config.amountINR * 100, currency: "INR" }
  // 3. Use Route API to transfer to NGO: POST /v1/transfers
  //    Body: { account: config.ngoId, amount: config.amountINR * 100 }
  // 4. If mandate inactive/expired: throw error → BullMQ retries → after 3 failures → DEBT
  console.info({ jobId, mandateId: razorpayMandateId, amountINR: config.amountINR }, 'Financial charge executed (stub)')
}

// ─── Worker Setup ─────────────────────────────────────────────────────────────

export function startConsequenceWorker(): Worker {
  const worker = new Worker<ConsequenceJobData>(
    CONSEQUENCE_QUEUE_NAME,
    processConsequenceJob,
    {
      connection: redis,
      concurrency: 5,
    },
  )

  worker.on('failed', (job, err) => {
    console.error(
      { jobId: job?.id, data: job?.data, error: err.message },
      'Consequence job failed after all retries — marking pact as DEBT',
    )

    if (!job?.data) return

    // Move the pact to DEBT state — the consequence could not be executed.
    // In DEBT state the user cannot create new pacts until they resolve the outstanding consequence.
    const { pactId, consequenceId } = job.data
    db.$transaction([
      db.consequence.update({
        where: { id: consequenceId },
        data: { status: 'DEBT' },
      }),
      db.pact.update({
        where: { id: pactId },
        data: { status: 'FAILED' },
      }),
    ]).catch((dbErr) => {
      console.error({ jobId: job.id, pactId, err: dbErr }, 'Failed to write DEBT state after job failure')
    })
  })

  console.info('Consequence worker started')
  return worker
}
