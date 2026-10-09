import type { VehicleSummary } from '@otmetki/schemas';

import * as z from 'zod';

export const guessFormSchema = z.object({
  pick: z.custom<VehicleSummary>().nullable()
});
