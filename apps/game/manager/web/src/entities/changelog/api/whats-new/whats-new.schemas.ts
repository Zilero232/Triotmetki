import { z } from 'zod';

import { localizedSchema } from '@/shared/lib';

const componentChangeSchema = z.object({
  id: z.string(),
  version: z.string().nullable(),
  notes: localizedSchema.nullable()
});

const changelogReleaseSchema = z.object({
  version: z.string(),
  publishedAt: z.string(),
  games: z.array(z.string()),
  notes: localizedSchema.nullable(),
  changes: z.array(componentChangeSchema)
});

export const whatsNewSchema = z.object({
  releases: z.array(changelogReleaseSchema),
  offline: z.boolean(),
  installedVersion: z.string().nullable(),
  freshComponents: z.array(z.string()),
  showCard: z.boolean()
});
