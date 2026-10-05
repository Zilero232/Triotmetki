import type { z } from 'zod';

import type { installPlanSchema } from './setup.schemas';

export type InstallPlan = z.infer<typeof installPlanSchema>;

export type InstallRequest = {
  clientPath: string | null;
  components: string[];
  removeOthers: string[];
};
