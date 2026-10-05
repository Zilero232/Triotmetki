import type { z } from 'zod';

import type { managerSettingsSchema } from './settings.schemas';

export type ManagerSettings = z.infer<typeof managerSettingsSchema>;
