import * as z from 'zod';

export const serverEnvSchema = z.object({
  INTERNAL_API_TOKEN: z.string().min(32),
  LESTA_NOTICE: z.enum(['true', 'false']).transform((value) => value === 'true')
});
