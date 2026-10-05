import type { z } from 'zod';

import type { collectorHealthSchema, collectorJobSchema, healthDetailsSchema, healthSchema, queueBacklogSchema } from './health.schemas';

export type Health = z.infer<typeof healthSchema>;
export type HealthDetails = z.infer<typeof healthDetailsSchema>;
export type CollectorHealth = z.infer<typeof collectorHealthSchema>;
export type CollectorJob = z.infer<typeof collectorJobSchema>;
export type CollectorJobName = CollectorJob['job'];
export type QueueBacklog = z.infer<typeof queueBacklogSchema>;
