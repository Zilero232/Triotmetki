import { clamp } from 'remeda';

import { formatPercent, trendOf } from '@/shared/lib/format-number';

import type { DeltaView, ScaleMark, ScaleMarksInput } from './tank-card-view.types';

import { TANK_CARD } from '../../config';

const STEP_COUNT = TANK_CARD.steps.length - 1;

const share = (value: number): number => Math.round(value * 10_000) / 100;

export const scalePosition = (percent: number): number => {
  const value = clamp(percent, { min: 0, max: 100 });
  const index = TANK_CARD.steps.findIndex((level, step) => step > 0 && value <= level);
  const step = index === -1 ? STEP_COUNT : index;
  const low = TANK_CARD.steps[step - 1] ?? 0;
  const high = TANK_CARD.steps[step] ?? 100;

  return share((step - 1 + (value - low) / (high - low)) / STEP_COUNT);
};

export const scaleMarks = ({ thresholds, percent }: ScaleMarksInput): ScaleMark[] =>
  TANK_CARD.steps.slice(1).map((level) => {
    const threshold = thresholds.find((item) => item.level === level);

    return {
      level,
      at: scalePosition(level),
      label: formatPercent({ value: level, digits: 0 }),
      average: threshold?.average ?? null,
      reached: threshold?.reached ?? (percent !== null && percent >= level),
      isEnd: level === 100
    };
  });

export const deltaView = (delta: number | null): DeltaView | null => {
  if (delta === null) {
    return null;
  }

  const text = formatPercent({ value: delta, digits: 2, signed: true, unit: false });

  return { text, direction: TANK_CARD.directions[trendOf(delta)] };
};
