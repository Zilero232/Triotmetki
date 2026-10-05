import type { z } from 'zod';

import type { sessionSharePayloadSchema } from './session-share-queue.schemas';

export type SessionSharePayload = z.infer<typeof sessionSharePayloadSchema>;
