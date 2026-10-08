export type DistanceLimits = readonly [number, number];

export type DistanceAtInput = { fraction: number; limits: DistanceLimits; step: number };

export type FractionOfInput = { value: number; limits: DistanceLimits };
