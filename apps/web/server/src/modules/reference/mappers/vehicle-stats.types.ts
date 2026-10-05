import type { z } from 'zod';

import type { storedProfileSchema } from './vehicle-stats.schemas';

export type StoredProfile = z.input<typeof storedProfileSchema>;

export type StoredShell = NonNullable<StoredProfile['shells']>[number];
