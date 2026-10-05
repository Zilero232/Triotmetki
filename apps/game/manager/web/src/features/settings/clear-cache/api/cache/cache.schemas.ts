import { z } from 'zod';

const cacheTargetSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.enum(['app_data', 'game']),
  path: z.string(),
  sizeBytes: z.number(),
  files: z.number()
});

export const cachePlanSchema = z.object({
  targets: z.array(cacheTargetSchema),
  totalBytes: z.number()
});

export const cacheResultSchema = z.object({
  freedBytes: z.number(),
  cleared: z.array(z.string()),
  failed: z.array(z.string())
});
