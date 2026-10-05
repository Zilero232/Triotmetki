import type { z } from 'zod';

import type { syncReportSchema, syncResolutionSchema } from './site-sync.schemas';

export type SyncResolution = z.infer<typeof syncResolutionSchema>;

export type SyncReport = z.infer<typeof syncReportSchema>;

export type SyncNowInput = {
  clientPath: string | null;
  resolution: SyncResolution | null;
};
