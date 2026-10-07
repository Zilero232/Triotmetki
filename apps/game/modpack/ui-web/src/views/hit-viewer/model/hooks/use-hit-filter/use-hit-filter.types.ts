import type { ViewerState, ViewerTone } from '../../../lib/viewer-protocol';

export type FilterPick = { key: string; tone: ViewerTone | null };

export type UseHitFilterInput = {
  state: ViewerState | null;
  onPick: (index: number) => void;
};
