import type { DeltaDirection } from '@/ui-kit';

import type { TankCardThreshold } from '../../model/schemas';

export type DeltaView = { text: string; direction: DeltaDirection };

export type ScaleMark = { level: number; at: number; label: string; average: string | null; reached: boolean; isEnd: boolean };

export type ScaleMarksInput = { thresholds: readonly TankCardThreshold[]; percent: number | null };
