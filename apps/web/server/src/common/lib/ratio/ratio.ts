import { winRate } from '@otmetki/ratings';
import { clamp } from 'remeda';

import type { RatioInput, WinRateCounts } from './ratio.types';

export const ratio = ({ value, by }: RatioInput): number | null => (by > 0 ? value / by : null);

export const clampPercent = (value: number | null | undefined): number | null =>
  value === null || value === undefined || !Number.isFinite(value) ? null : clamp(value, { min: 0, max: 100 });

export const clampPercentDelta = (value: number | null | undefined): number | null =>
  value === null || value === undefined || !Number.isFinite(value) ? null : clamp(value, { min: -100, max: 100 });

export const percentOf = ({ value, by }: RatioInput): number | null => (by > 0 ? clampPercent((value * 100) / by) : null);

export const winRatePercent = ({ wins, battles }: WinRateCounts): number | null => (battles > 0 ? winRate({ wins, battles }) : null);

export const winRateShare = ({ wins, battles }: WinRateCounts): number | null => ratio({ value: wins, by: battles });
