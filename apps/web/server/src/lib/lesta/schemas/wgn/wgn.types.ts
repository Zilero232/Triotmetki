import type { z } from 'zod';

import type { serverOnlineSchema } from './wgn.schemas';

export type ServerOnline = z.infer<typeof serverOnlineSchema>;
