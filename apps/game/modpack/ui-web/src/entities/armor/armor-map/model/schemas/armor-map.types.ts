import type * as z from 'zod/mini';

import type { armorLegendSchema, armorMapSchema, armorModeSchema, armorReadoutSchema } from './armor-map.schemas';

export type ArmorMode = z.infer<typeof armorModeSchema>;
export type ArmorMapData = z.infer<typeof armorMapSchema>;
export type ArmorLegendData = z.infer<typeof armorLegendSchema>;
export type ArmorReadout = z.infer<typeof armorReadoutSchema>;
