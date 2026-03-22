import { Queue } from 'bullmq'

import { redis } from '../clients/redis-client'
import { CONSEQUENCE_QUEUE_NAME } from '../jobs/consequence-job'

// The consequence queue — used by the EOD scheduler to enqueue jobs
export const consequenceQueue = new Queue(CONSEQUENCE_QUEUE_NAME, { connection: redis })

/**
 * End-of-day scheduler — detects missed check-ins and enqueues consequence jobs.
 *
 * Design: runs every minute and checks which users are currently at 23:59
 * in their stored timezone. This avoids a single global cron that would fire
 * consequences at the wrong local time for users in different timezones.
 *
 * Flow per user at 23:59 local time:
 *   1. Find all ACTIVE pacts with no check-in for today (in user's timezone)
 *   2. If grace days remain → deduct one (atomic DB transaction), notify user
 *   3. If no grace days → enqueue a consequence job to BullMQ
 */
export async function startEodScheduler(): Promise<void> {
  // TODO: implement per-timezone EOD detection
  // Strategy: query users whose stored timezone puts them at 23:59 right now,
  // then run the missed-check-in detection for those users only.
  console.info('EOD scheduler started')
}
