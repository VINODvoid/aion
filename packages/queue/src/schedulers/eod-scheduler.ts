import { Queue } from 'bullmq'

import { db } from '@aion/db'
import { getTodayInTimezone } from '@aion/shared'

import { redis } from '../clients/redis-client'
import { CONSEQUENCE_QUEUE_NAME, type ConsequenceJobData } from '../jobs/consequence-job'

// The consequence queue — used by the EOD scheduler to enqueue jobs
export const consequenceQueue = new Queue<ConsequenceJobData>(CONSEQUENCE_QUEUE_NAME, {
  connection: redis,
  defaultJobOptions: {
    // Retry up to 3 times with exponential backoff before moving to failed set
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
  },
})

/**
 * End-of-day scheduler — detects missed check-ins and enqueues consequence jobs.
 *
 * Design: runs every 60 seconds and checks which users are currently at 23:59
 * in their stored timezone. This avoids a single global cron that would fire
 * consequences at the wrong local time for users in different timezones.
 *
 * Flow per user at 23:59 local time:
 *   1. Find all ACTIVE pacts with no check-in for today (in user's timezone)
 *   2. If grace days remain → deduct one (atomic DB transaction)
 *   3. If no grace days → enqueue a consequence job to BullMQ
 */
export async function startEodScheduler(): Promise<void> {
  // Run once immediately on startup, then every 60 seconds
  await runEodCheck()
  setInterval(() => {
    runEodCheck().catch((err) => {
      console.error({ err }, 'EOD check failed')
    })
  }, 60 * 1000)

  console.info('EOD scheduler started')
}

// ─── Core EOD Logic ───────────────────────────────────────────────────────────

async function runEodCheck(): Promise<void> {
  // Get all distinct timezones from users with at least one active pact.
  // We only care about timezones that have active pacts — no point checking others.
  const timezoneRows = await db.user.findMany({
    where: { pacts: { some: { status: 'ACTIVE' } } },
    select: { timezone: true },
    distinct: ['timezone'],
  })

  const eodTimezones = timezoneRows
    .map((r) => r.timezone)
    .filter(isCurrentlyEod)

  if (eodTimezones.length === 0) return

  console.info({ timezones: eodTimezones }, 'EOD check running for timezones')

  // Process each EOD timezone independently — errors in one should not block others
  await Promise.allSettled(eodTimezones.map(processTimezone))
}

async function processTimezone(timezone: string): Promise<void> {
  const today = getTodayInTimezone(timezone)

  // Find all users in this timezone with at least one active pact
  const users = await db.user.findMany({
    where: {
      timezone,
      pacts: { some: { status: 'ACTIVE' } },
    },
    select: {
      id: true,
      pacts: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          frequency: true,
          graceDaysAllowed: true,
          graceDaysUsed: true,
          consequence: {
            select: { id: true, status: true },
          },
        },
      },
    },
  })

  for (const user of users) {
    for (const pact of user.pacts) {
      await processMissedPact(user.id, pact, today, timezone).catch((err) => {
        console.error({ err, userId: user.id, pactId: pact.id }, 'Failed to process missed pact')
      })
    }
  }
}

type ActivePact = {
  id: string
  frequency: string
  graceDaysAllowed: number
  graceDaysUsed: number
  consequence: { id: string; status: string } | null
}

async function processMissedPact(
  userId: string,
  pact: ActivePact,
  today: string,
  timezone: string,
): Promise<void> {
  // Check if the user already checked in for today
  const checkIn = await db.checkIn.findUnique({
    where: { pactId_date: { pactId: pact.id, date: today } },
    select: { id: true },
  })

  // Check-in exists — pact is fulfilled for today, nothing to do
  if (checkIn) return

  // Check if a grace day was already used today — the scheduler may have already
  // processed this pact in a previous run (e.g. if the process restarted at 23:59)
  const graceDayUsedToday = await db.graceDay.findUnique({
    where: { pactId_date: { pactId: pact.id, date: today } },
    select: { id: true },
  })
  if (graceDayUsedToday) return

  // Check if a consequence job has already been enqueued today for this pact.
  // BullMQ job IDs are deterministic (pactId:date) — this prevents duplicate enqueues
  // if the scheduler runs multiple times at 23:59 (e.g. after a restart).
  const jobId = `consequence:${pact.id}:${today}`
  const existingJob = await consequenceQueue.getJob(jobId)
  if (existingJob) return

  const currentMonth = today.slice(0, 7)
  const graceDaysUsedThisMonth = await db.graceDay.count({
    where: { pactId: pact.id, date: { startsWith: currentMonth } },
  })
  const graceDaysRemaining = pact.graceDaysAllowed - graceDaysUsedThisMonth

  if (graceDaysRemaining > 0) {
    // Grace day available — deduct it atomically instead of firing the consequence.
    // Both writes must succeed together to prevent a deduction without a log record.
    await db.$transaction([
      db.graceDay.create({
        data: {
          pactId: pact.id,
          date: today,
          reason: 'Auto-deducted by EOD scheduler',
        },
      }),
      db.pact.update({
        where: { id: pact.id },
        data: { graceDaysUsed: { increment: 1 } },
      }),
    ])

    console.info(
      { pactId: pact.id, userId, date: today, timezone },
      'Grace day auto-deducted — missed check-in covered',
    )
    return
  }

  // No grace days remaining — consequence must fire
  if (!pact.consequence) {
    console.error({ pactId: pact.id }, 'Pact has no consequence record — cannot enqueue job')
    return
  }

  if (pact.consequence.status !== 'ARMED') {
    // Consequence already fired, in debt, or disarmed — do not re-enqueue
    console.warn(
      { pactId: pact.id, status: pact.consequence.status },
      'Consequence not ARMED — skipping',
    )
    return
  }

  // Enqueue with a deterministic job ID — safe to call multiple times.
  // If the job already exists BullMQ will deduplicate it.
  await consequenceQueue.add(
    'fire-consequence',
    {
      pactId: pact.id,
      userId,
      consequenceId: pact.consequence.id,
    },
    { jobId },
  )

  console.info(
    { pactId: pact.id, userId, consequenceId: pact.consequence.id, date: today },
    'Consequence job enqueued for missed check-in',
  )
}

// ─── Timezone Helpers ─────────────────────────────────────────────────────────

// Returns true if the given IANA timezone is currently at 23:59.
// This is how we detect EOD per user without a separate cron per timezone.
function isCurrentlyEod(timezone: string): boolean {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(new Date())
    const hour = parts.find((p) => p.type === 'hour')?.value
    const minute = parts.find((p) => p.type === 'minute')?.value
    return hour === '23' && minute === '59'
  } catch {
    // Invalid timezone string — log and skip rather than crashing the scheduler
    console.warn({ timezone }, 'Invalid timezone — skipping EOD check')
    return false
  }
}
