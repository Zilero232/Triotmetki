import type { z } from 'zod';

import type { storedIntegrationConfigSchema } from '../../dto/integrations.schemas';

export type StoredIntegrationConfig = z.infer<typeof storedIntegrationConfigSchema>;
