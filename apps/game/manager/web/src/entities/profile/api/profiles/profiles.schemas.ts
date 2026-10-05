import { z } from 'zod';

export const profileSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  created: z.number().nullable(),
  updated: z.number().nullable(),
  installed: z.array(z.string()).nullable(),
  active: z.boolean()
});

export const profilesViewSchema = z.object({
  max: z.number(),
  active: z.string().nullable(),
  profiles: z.array(profileSummarySchema),
  pendingSets: z.number().int().nonnegative()
});
