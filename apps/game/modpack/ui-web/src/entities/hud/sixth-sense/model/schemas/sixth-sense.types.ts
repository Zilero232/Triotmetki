import type * as z from 'zod/mini';

import type { sixthSenseSchema } from './sixth-sense.schemas';

export type SixthSenseData = z.infer<typeof sixthSenseSchema>;
