import type { z } from 'zod';

import type { foreignEntrySchema, installPlanSchema } from './setup.schemas';

export type ForeignEntry = z.infer<typeof foreignEntrySchema>;

export type InstallPlan = z.infer<typeof installPlanSchema>;

export type InstallRequest = {
  clientPath: string | null;
  components: string[];
  removeOthers: string[];
};
