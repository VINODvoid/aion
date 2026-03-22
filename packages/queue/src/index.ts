import { redis } from './clients/redis-client'
import { startConsequenceWorker } from './workers/consequence-worker'
import { startEodScheduler } from './schedulers/eod-scheduler'

async function main(): Promise<void> {
  // Verify Redis is reachable before starting workers.
  // A failed ping throws immediately — better than silent worker failures.
  await redis.ping()
  console.info('Redis connected')

  // Start the consequence execution worker
  startConsequenceWorker()

  // Start the EOD scheduler that detects missed check-ins per timezone
  await startEodScheduler()

  console.info('AION queue workers running')
}

main().catch((err) => {
  console.error({ err }, 'Queue startup failed')
  process.exit(1)
})
