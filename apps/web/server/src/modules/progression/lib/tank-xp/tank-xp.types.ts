import type { BattleSample } from '../battle-samples/battle-samples.types';

export type XpOfSamplesInput = {
  samples: readonly BattleSample[];
  tier: number;
};
