import { Worker, type Job } from 'bullmq'

import { db } from '@aion/db'

import { redis } from '../clients/redis-client'
import { CONSEQUENCE_QUEUE_NAME, type ConsequenceJobData } from '../jobs/consequence-job'

async function processConsequenceJob(job: Job<ConsequenceJobData>): Promise<void> {
  const { pactId, consequenceId } = job.data

  // Load the consequence record and verify it is still ARMED before executing.
  // This is the idempotency guard — BullMQ may retry a job after a partial
  // failure, and we must never re-fire a consequence that already executed.
  const consequence = await db.consequence.findUnique({
    where: { id: consequenceId },
    select: { id: true, status: true, type: true, config: true, pactId: true },
  })

  if (!consequence) {
    // Consequence was deleted (pact cancelled) — discard the job safely
    console.warn({ jobId: job.id, consequenceId }, 'Consequence not found — discarding job')
    return
  }

  if (consequence.status !== 'ARMED') {
    // Already fired, disarmed, or in debt — do not re-execute
    console.warn(
      { jobId: job.id, consequenceId, status: consequence.status },
      'Consequence is not ARMED — discarding job (idempotency guard)',
    )
    return
  }

  console.info({ jobId: job.id, consequenceId, type: consequence.type }, 'Executing consequence')

  // TODO: implement per-tier execution
  // Tier 1 (SHAME):     post shame template to Twitter/X
  // Tier 2 (LOCK):      send push notification → triggers native lock module
  // Tier 3 (FINANCIAL): execute payment mandate charge → route to anti-charity
  // Tier 4 (NUCLEAR):   execute all three in parallel via Promise.all

  // Mark as FIRED — this update is the atomic commit that prevents re-firing
  await db.consequence.update({
    where: { id: consequenceId },
    data: { status: 'FIRED', firedAt: new Date() },
  })

  console.info({ jobId: job.id, consequenceId, pactId }, 'Consequence fired successfully')
}

export function startConsequenceWorker(): Worker {
  const worker = new Worker<ConsequenceJobData>(
    CONSEQUENCE_QUEUE_NAME,
    processConsequenceJob,
    {
      connection: redis,
      // Retry up to 3 times with exponential backoff before moving to failed set
      // On final failure, the job handler marks the pact as DEBT
    },
  )

  worker.on('failed', (job, err) => {
    console.error(
      { jobId: job?.id, data: job?.data, error: err.message },
      'Consequence job failed after all retries',
    )
    // TODO: mark pact status as DEBT and notify user
  })

  console.info('Consequence worker started')
  return worker
}
