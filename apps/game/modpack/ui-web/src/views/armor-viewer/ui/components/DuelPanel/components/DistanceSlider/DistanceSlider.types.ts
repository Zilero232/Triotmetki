import type { DistanceLimits } from '../../../../../lib/distance-scale';

export type DistanceSliderProps = {
  label: string;
  template: string;
  value: number;
  limits: DistanceLimits;
  onCommit: (metres: number) => void;
};
