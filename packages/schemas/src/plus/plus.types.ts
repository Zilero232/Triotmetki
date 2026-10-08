import type { z } from 'zod';

import type { plusFeatureSchema, plusLimitKeySchema, plusStateKindSchema, plusStateSchema } from './plus.schemas';

export type PlusFeature = z.infer<typeof plusFeatureSchema>;
export type PlusStateKind = z.infer<typeof plusStateKindSchema>;
export type PlusLimitKey = z.infer<typeof plusLimitKeySchema>;
export type PlusState = z.infer<typeof plusStateSchema>;

export type PlusCountKey = Exclude<PlusLimitKey, 'historyDays'>;

export type PlusLimitInput = {
  key: PlusCountKey;
  isPlus: boolean;
};
