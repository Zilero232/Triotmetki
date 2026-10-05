import { z } from 'zod';

export const componentStateSchema = z.enum(['enabled', 'disabled', 'missing']);

const installedComponentSchema = z.object({
  id: z.string(),
  state: componentStateSchema,
  file: z.string().nullable(),
  version: z.string().nullable()
});

export const installationSchema = z.object({
  installed: z.boolean(),
  clientPath: z.string(),
  gameVersion: z.string(),
  manifestGameVersion: z.string().nullable(),
  modsDir: z.string(),
  modpackVersion: z.string().nullable(),
  installedAt: z.string().nullable(),
  needsMigration: z.boolean(),
  components: z.array(installedComponentSchema)
});
