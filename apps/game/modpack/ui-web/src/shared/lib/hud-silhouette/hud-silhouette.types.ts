import type { HUD_SILHOUETTES } from '../../config';

export type SilhouetteShape = keyof typeof HUD_SILHOUETTES.shapes;

export type SilhouettePoint = readonly [number, number];

export type AxisInput = { points: readonly SilhouettePoint[]; value: number };
