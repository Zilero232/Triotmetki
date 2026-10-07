import type { ViewerRow, ViewerTone } from '../viewer-protocol';

export type ToneCount = { tone: ViewerTone; count: number; label: string };

export type FilterRowsInput = { rows: ViewerRow[]; tone: ViewerTone | null };
