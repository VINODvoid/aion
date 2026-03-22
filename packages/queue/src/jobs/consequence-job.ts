import { z } from 'zod'

// Queue name — used by both the producer (API) and consumer (worker).
// Keep as a constant to prevent typos causing jobs to be silently dropped.
export const CONSEQUENCE_QUEUE_NAME = 'consequence-execution'

// Schema for validating job data before enqueuing.
// If the data doesn't match, the job is rejected at the producer — not at
// the worker — which is far easier to debug.
export const consequenceJobSchema = z.object({
  pactId: z.string().uuid(),
  userId: z.string().uuid(),
  consequenceId: z.string().uuid(),
})

export type ConsequenceJobData = z.infer<typeof consequenceJobSchema>
