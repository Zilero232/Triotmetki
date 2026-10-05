import type { z } from 'zod';

import type {
  mapDetailSchema,
  mapListSchema,
  mapRefSchema,
  mapsQuerySchema,
  mapStatsSchema,
  mapSummarySchema,
  mapTanksSchema,
  tankMapSampleSchema,
  tankMapsSchema
} from './maps.schemas';

export type MapsQuery = z.infer<typeof mapsQuerySchema>;
export type MapSummary = z.infer<typeof mapSummarySchema>;
export type MapStats = z.infer<typeof mapStatsSchema>;
export type MapDetail = z.infer<typeof mapDetailSchema>;
export type MapList = z.infer<typeof mapListSchema>;
export type MapRef = z.infer<typeof mapRefSchema>;
export type TankMapSample = z.infer<typeof tankMapSampleSchema>;
export type TankMaps = z.infer<typeof tankMapsSchema>;
export type MapTanks = z.infer<typeof mapTanksSchema>;
