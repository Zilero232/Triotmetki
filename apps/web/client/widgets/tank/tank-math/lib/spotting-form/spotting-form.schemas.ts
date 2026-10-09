import { FOLIAGE_KINDS } from '@otmetki/gamedata';
import * as z from 'zod';

import { TANK_MATH } from '../../config';

export const spottingSideSchema = z.object({
  isMoving: z.boolean(),
  isFiring: z.boolean(),
  foliage: z.enum(FOLIAGE_KINDS),
  isFoliageNear: z.boolean(),
  hasCamoNet: z.boolean(),
  hasPaint: z.boolean(),
  camoSkill: z.number().min(TANK_MATH.camoSkill.min).max(TANK_MATH.camoSkill.max),
  hasOptics: z.boolean(),
  hasBinoculars: z.boolean(),
  hasCrewSkills: z.boolean()
});

export const spottingFormSchema = z.object({
  targetId: z.number().int().positive().nullable(),
  me: spottingSideSchema,
  them: spottingSideSchema
});
