import { z } from 'zod';

import { countSchema, isoDateTimeSchema } from '../common/primitives/primitives.schemas';

export const gameVersionSchema = z.object({
  version: z.string().nullable(),
  title: z.string().nullable(),
  releasedAt: isoDateTimeSchema.nullable(),
  notesUrl: z.string().nullable()
});

const serverOnlineSchema = z.object({
  server: z.string(),
  online: countSchema
});

export const serversOnlineSchema = z.object({
  online: countSchema.nullable(),
  servers: z.array(serverOnlineSchema),
  fetchedAt: isoDateTimeSchema.nullable()
});
