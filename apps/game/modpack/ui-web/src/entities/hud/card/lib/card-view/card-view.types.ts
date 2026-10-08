import type { HudTone } from '@/ui-kit';

import type { CardRowData } from '../../model/schemas';

export type RowIcon = { icon: string | null; tone: HudTone | null };

export type CardRowEntry = { key: string; row: CardRowData };
