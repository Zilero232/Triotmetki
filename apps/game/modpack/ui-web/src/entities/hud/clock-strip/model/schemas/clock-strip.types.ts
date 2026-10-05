import type * as z from 'zod/mini';

import type { clockStripSchema } from './clock-strip.schemas';

export type ClockStripData = z.infer<typeof clockStripSchema>;
