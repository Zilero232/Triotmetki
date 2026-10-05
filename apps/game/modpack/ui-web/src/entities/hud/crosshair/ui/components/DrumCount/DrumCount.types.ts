import type { DrumData } from '../../../model/schemas';
import type { ShellPaint } from '../ShellIcon';

export type DrumCountProps = {
  clip: DrumData;
  loadedPaint: Extract<ShellPaint, 'gold' | 'loaded'>;
  ticked: boolean;
};
