import type * as z from 'zod/mini';

import type { cardChipSchema, cardRowSchema, cardSchema } from './card.schemas';

export type CardData = z.infer<typeof cardSchema>;
export type CardRowData = z.infer<typeof cardRowSchema>;
export type CardChipData = z.infer<typeof cardChipSchema>;
