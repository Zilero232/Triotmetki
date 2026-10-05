import { MOE } from '@otmetki/ratings';

export const LESTA_MASTERY = {
  maxPercentiles: 10
} as const;

export const EXPECTED_VALUES_HEADER = {
  isoDayPattern: /^\d{4}-\d{2}-\d{2}/
} as const;

export const POLIROID_MARK = {
  p65: MOE.markPercents[0],
  p85: MOE.markPercents[1],
  p95: MOE.markPercents[2]
} as const;
