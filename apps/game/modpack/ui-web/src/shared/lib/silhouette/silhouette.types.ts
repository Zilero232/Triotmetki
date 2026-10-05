import type { HUD_SILHOUETTES } from '@/shared/config';

export type SilhouetteShape = keyof typeof HUD_SILHOUETTES.shapes;

export type SilhouettePoint = readonly [number, number];

export type AxisInput = { points: readonly SilhouettePoint[]; value: number };

export type SilhouetteBox = { width: number; height: number; viewBox: string };
