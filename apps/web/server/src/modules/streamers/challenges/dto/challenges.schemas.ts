import { z } from 'zod';

export const storedChallengeProgressSchema = z.looseObject({
  battles: z.number().optional(),
  value: z.number().optional(),
  battleIds: z.array(z.string()).optional()
});
