import * as z from 'zod/mini';

import { AIM_ARMOR } from '../../config';

export const aimArmorSchema = z.object({
  value: z.string(),
  tone: z.enum(AIM_ARMOR.tones),
  ricochet: z.boolean(),
  nominal: z.string(),
  piercing: z.string(),
  angle: z.string(),
  unit: z.string(),
  piercing_label: z.string()
});
