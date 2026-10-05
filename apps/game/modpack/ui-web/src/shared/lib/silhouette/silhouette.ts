import { HUD_SILHOUETTES } from '@/shared/config';

import type { AxisInput, SilhouetteBox, SilhouettePoint, SilhouetteShape } from './silhouette.types';

export const isSilhouetteShape = (value: string | null | undefined): value is SilhouetteShape =>
  typeof value === 'string' && Object.keys(HUD_SILHOUETTES.shapes).includes(value);

export const silhouetteOf = (shape: string | null | undefined) => HUD_SILHOUETTES.shapes[isSilhouetteShape(shape) ? shape : HUD_SILHOUETTES.fallback];

export const onSilhouette = ({ points, value }: AxisInput): number => {
  const xs = points.map(([x]) => x);
  const start = Math.min(...xs);
  const end = Math.max(...xs);
  const share = Math.min(100, Math.max(0, value)) / 100;

  return Math.round(((start + share * (end - start)) / HUD_SILHOUETTES.viewBox.width) * 10_000) / 100;
};

export const polygonPath = (points: readonly SilhouettePoint[]): string =>
  `${points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${String(x)} ${String(y)}`).join(' ')} Z`;

export const silhouetteBox = (): SilhouetteBox => {
  const { width, height } = HUD_SILHOUETTES.viewBox;

  return { width, height, viewBox: `0 0 ${String(width)} ${String(height)}` };
};
