import * as z from 'zod/mini';

import { GUN_ARC } from '../../config';

const toneSchema = z.enum(GUN_ARC.tones);

export const gunArcSchema = z.object({
  scale: z.boolean(),
  position: z.number(),
  centre: z.number(),
  left: z.string(),
  right: z.string(),
  left_tone: toneSchema,
  right_tone: toneSchema,
  gun_tone: toneSchema,
  yaw: z.string()
});
