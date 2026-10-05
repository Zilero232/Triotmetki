import { z } from 'zod';

import { GAME_HEALTH } from '../../config';

const loadFailureSchema = z.object({
  component: z.string(),
  kind: z.enum(GAME_HEALTH.kinds),
  source: z.enum(GAME_HEALTH.sources),
  excerpt: z.string()
});

export const healthReportSchema = z.object({
  logTime: z.string().nullable(),
  stale: z.boolean(),
  failures: z.array(loadFailureSchema)
});
