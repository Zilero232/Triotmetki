import type { MoeCurvePoint } from '@otmetki/schemas';

import type { MasteryThresholdRecord, MoeThresholdRecord } from '../../reference';

export type ToModMoeThresholdsInput = {
  tankId: number;
  moe: MoeThresholdRecord | null;
  mastery: MasteryThresholdRecord | null;
  curve: MoeCurvePoint[];
};
