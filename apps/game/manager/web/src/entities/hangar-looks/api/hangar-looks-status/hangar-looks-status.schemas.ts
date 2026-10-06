import { z } from 'zod';

import { HANGAR_LOOKS } from '../../config';

export const skipReasonSchema = z.enum(HANGAR_LOOKS.reasons);

export const hangarLooksStatusSchema = z.object({
  state: z.enum(HANGAR_LOOKS.states),
  clientVersion: z.string().nullable(),
  looks: z.array(z.string()),
  skipped: z.array(z.object({ id: z.string(), reason: skipReasonSchema }))
});
