import type { DrumCellState, ShellMotion } from '../../../lib/drum-view';
import type { ShellKind } from '../../../model/schemas';
import type { ShellPaint } from '../ShellIcon';

export type ShellSlotProps = {
  kind: ShellKind | null;
  state: DrumCellState;
  loadedPaint: Extract<ShellPaint, 'gold' | 'loaded'>;
  motion: ShellMotion | null;
  progress: number;
  width: number;
  height: number;
};
