import type { GestureAtInput, GestureKind, InsideInput } from './hit.types';

const inside = ({ rect, x, y }: InsideInput): boolean =>
  rect !== null && rect.width > 0 && rect.height > 0 && x >= rect.left && x <= rect.left + rect.width && y >= rect.top && y <= rect.top + rect.height;

export const gestureAt = ({ targets, x, y }: GestureAtInput): GestureKind | null =>
  targets.find((target) => inside({ rect: target.rect, x, y }))?.kind ?? null;
