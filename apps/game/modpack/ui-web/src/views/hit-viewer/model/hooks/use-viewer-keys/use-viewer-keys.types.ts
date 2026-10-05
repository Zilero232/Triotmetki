import type { HitStep } from '../../../lib/hit-step';

export type UseViewerKeysInput = {
  onStep: (step: HitStep) => void;
  onSwitchTab: () => void;
};
