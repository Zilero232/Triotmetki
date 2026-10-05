import type { z } from 'zod';

import type {
  mapQueueSchema,
  mapRotationRowSchema,
  mapRotationSchema,
  mapStatsQuerySchema,
  queueCellSchema,
  queueNowSchema
} from './dto/map-stats.schemas';

export type MapStatsQuery = z.infer<typeof mapStatsQuerySchema>;

export type MapRotationRow = z.infer<typeof mapRotationRowSchema>;

export type MapRotationView = z.infer<typeof mapRotationSchema>;

export type QueueCell = z.infer<typeof queueCellSchema>;

export type QueueNow = z.infer<typeof queueNowSchema>;

export type MapQueueView = z.infer<typeof mapQueueSchema>;

export type MapQueueInput = MapStatsQuery & {
  now: Date;
};
