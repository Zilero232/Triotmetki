import type { z } from 'zod';

import type { createFollowSchema, followKindSchema, followSchema } from './follows.schemas';

export type FollowKind = z.infer<typeof followKindSchema>;
export type Follow = z.infer<typeof followSchema>;
export type CreateFollowInput = z.infer<typeof createFollowSchema>;
