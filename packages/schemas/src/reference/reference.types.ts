import type { z } from 'zod';

import type { gameVersionSchema, serversOnlineSchema } from './reference.schemas';

export type GameVersion = z.infer<typeof gameVersionSchema>;
export type ServersOnline = z.infer<typeof serversOnlineSchema>;
