import { z } from 'zod';

import { catalogSchema } from '@/entities/catalog';
import { gameClientSchema } from '@/entities/client';
import { installationSchema } from '@/entities/installation';
import { managerErrorCodeSchema } from '@/shared/api';
import { localizedSchema } from '@/shared/lib';

export const foreignEntrySchema = z.object({
  path: z.string(),
  name: z.string(),
  isDir: z.boolean(),
  location: z.enum(['mods', 'res_mods'])
});

export const installPlanSchema = z.object({
  client: gameClientSchema,
  catalog: catalogSchema.nullable(),
  release: z.object({ version: z.string(), notes: localizedSchema.nullable() }).nullable(),
  source: z.enum(['release', 'offline', 'unavailable']),
  otherMods: z.array(foreignEntrySchema),
  installed: z.boolean(),
  currentComponents: z.array(z.string()),
  parkedComponents: z.array(z.string())
});

export const installWarningSchema = z.object({
  step: z.enum(['other_mods', 'dependencies']),
  code: managerErrorCodeSchema.catch('unknown')
});

export const installOutcomeSchema = z.object({
  installation: installationSchema,
  warnings: z.array(installWarningSchema)
});
