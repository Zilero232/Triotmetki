import { MOE } from '@otmetki/ratings';

import type { MoeThresholdRecord } from '../../reference';
import type { ModMoeThresholds } from '../marks.types';
import type { ToModMoeThresholdsInput } from './mod-thresholds.types';

const toModThresholdLevels = (moe: MoeThresholdRecord): ModMoeThresholds['thresholds'] => ({
  ...Object.fromEntries(MOE.markPercents.map((percent) => [String(percent), moe[`p${percent}` as const]])),
  ...(moe.p100 === null ? {} : { [String(MOE.maxPercent)]: moe.p100 })
});

export const toModMoeThresholds = ({ tankId, moe, mastery, curve }: ToModMoeThresholdsInput): ModMoeThresholds => ({
  tank_id: tankId,
  is_enough: moe !== null,
  thresholds: moe ? toModThresholdLevels(moe) : {},
  curve,
  ...(mastery ? { mastery: { class3: mastery.class3, class2: mastery.class2, class1: mastery.class1, ace: mastery.master } } : {}),
  updated_at: moe ? moe.capturedAt.toISOString() : null,
  source: moe ? moe.source : null
});
