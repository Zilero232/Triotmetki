import type { z } from 'zod';

import type { clientsViewSchema } from './clients.schemas';

export type ClientsView = z.infer<typeof clientsViewSchema>;
