import { playerSummarySchema, vehicleSummarySchema } from '@otmetki/schemas';
import * as z from 'zod';

import { COMPARE_KINDS } from '../../config';

export const compareSelectionSchema = z.object({
  tank: z
    .array(
      vehicleSummarySchema.pick({
        tankId: true,
        name: true,
        shortName: true,
        slug: true,
        nation: true,
        type: true,
        tier: true,
        isPremium: true,
        images: true
      })
    )
    .catch([]),
  player: z.array(playerSummarySchema.pick({ accountId: true, nickname: true })).catch([]),
  active: z.enum(COMPARE_KINDS).catch('tank')
});
