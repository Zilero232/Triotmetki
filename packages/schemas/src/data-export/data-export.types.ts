import type { z } from 'zod';

import type { analyticsExportSchema, rawStatsExportSchema } from './data-export.schemas';

export type RawStatsExport = z.infer<typeof rawStatsExportSchema>;
export type AnalyticsExport = z.infer<typeof analyticsExportSchema>;
