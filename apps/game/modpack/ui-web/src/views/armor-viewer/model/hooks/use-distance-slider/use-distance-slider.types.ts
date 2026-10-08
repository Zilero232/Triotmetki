import type { DistanceLimits } from '../../../lib/distance-scale';

export type UseDistanceSliderInput = { value: number; limits: DistanceLimits; onCommit: (value: number) => void };
