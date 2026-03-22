import { Redis } from 'ioredis'

// Single Redis connection shared across all BullMQ queue instances.
// BullMQ requires these two options — without them workers fail silently:
//   maxRetriesPerRequest: null — disables ioredis's built-in retry limit so
//     BullMQ can manage its own retry logic per job.
//   enableReadyCheck: false   — prevents BullMQ from blocking on the Redis
//     READY event, which is not needed for queue operations.
export const redis = new Redis(process.env['REDIS_URL'] ?? 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
})

redis.on('error', (err) => {
  // Log Redis connection errors without crashing the process.
  // BullMQ will reconnect automatically.
  console.error({ err }, 'Redis connection error')
})
