import type { z } from 'zod';

import type { authorSchema, buildSchema, createBuildSchema, loadoutSchema } from './community.schemas';

export type Author = z.infer<typeof authorSchema>;
export type Loadout = z.infer<typeof loadoutSchema>;
export type Build = z.infer<typeof buildSchema>;
export type CreateBuildInput = z.infer<typeof createBuildSchema>;
