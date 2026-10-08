import type { ArmorMode } from '../../model/schemas';

export type CellCode = { tone: number; pattern: number };

export type ToneColorInput = { tone: number; mode: ArmorMode };

export type HatchInput = { col: number; row: number; pattern: number };
