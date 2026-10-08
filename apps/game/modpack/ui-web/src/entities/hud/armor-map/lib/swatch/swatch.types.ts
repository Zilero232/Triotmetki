import type { ArmorMode } from '../../model/schemas';

export type SwatchInput = { tone: number; mode: ArmorMode; pattern?: number };

export type SwatchStyle = { backgroundColor: string };
