import { z } from 'zod';

import { STORED_SHOT } from '../../config/battle-review.constants';

export const storedShotSchema = z.object({
  damage: z.number().int().nonnegative(),
  nominal: z.number().int().positive().nullable(),
  shell: z.enum(STORED_SHOT.shells),
  outcome: z.enum(STORED_SHOT.outcomes),
  distance: z.number().int().nonnegative().nullable(),
  fatal: z.boolean()
});
