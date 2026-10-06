import type { z } from 'zod';

import type { hangarLooksStatusSchema, skipReasonSchema } from './hangar-looks-status.schemas';

export type HangarLooksStatus = z.infer<typeof hangarLooksStatusSchema>;

export type SkipReason = z.infer<typeof skipReasonSchema>;
