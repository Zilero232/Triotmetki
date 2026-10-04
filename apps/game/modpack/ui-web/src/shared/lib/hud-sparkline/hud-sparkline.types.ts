export type SparklineInput = { points: readonly number[]; width: number; height: number; inset: number };

export type SparklinePoint = { x: number; y: number };

export type SparklineView = { path: string; last: SparklinePoint | null };
