import type { PlayerMarks } from '@otmetki/schemas';

import { clamp } from 'remeda';

import type { MarkCounts } from './tank-marks.types';

import { PLAYER_MARKS } from '../../config/player-stats.constants';

export const clampMastery = (markOfMastery: number): number => clamp(markOfMastery, { min: 0, max: PLAYER_MARKS.maxMastery });

export const marksSummary = (items: readonly MarkCounts[]): PlayerMarks['summary'] => {
  const withMarks = (marks: number) => items.filter((item) => item.marksOnGun === marks).length;

  return {
    moe3: withMarks(3),
    moe2: withMarks(2),
    moe1: withMarks(1),
    mastery: items.filter((item) => item.markOfMastery === PLAYER_MARKS.maxMastery).length,
    eligible: items.length
  };
};
