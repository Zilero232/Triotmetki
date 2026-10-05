import { z } from 'zod';

export const conflictReportSchema = z.object({
  missing: z.array(z.object({ id: z.string() })),
  replaced: z.array(z.object({ id: z.string(), file: z.string() })),
  duplicates: z.array(z.object({ packageId: z.string(), files: z.array(z.string()), ours: z.boolean() })),
  foreign: z.array(z.object({ rule: z.string(), file: z.string(), packageId: z.string(), components: z.array(z.string()) })),
  overrides: z.array(z.object({ file: z.string(), location: z.enum(['mods', 'res_mods']), paths: z.array(z.string()), count: z.number() }))
});
