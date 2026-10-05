import type { z } from 'zod';

import type { dependencyStatusSchema, foreignEntrySchema, installPlanSchema } from './setup.schemas';

export type DependencyStatus = z.infer<typeof dependencyStatusSchema>;

export type ForeignEntry = z.infer<typeof foreignEntrySchema>;

export type InstallPlan = z.infer<typeof installPlanSchema>;

export type InstallRequest = {
  clientPath: string | null;
  components: string[];
  removeOthers: string[];
  excludedDependencies: string[];
};
