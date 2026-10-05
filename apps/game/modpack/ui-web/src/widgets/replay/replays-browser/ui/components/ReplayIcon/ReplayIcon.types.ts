import type { REPLAY_ICONS } from '../../../config';

export type ReplayIconName = keyof typeof REPLAY_ICONS.paths;

export type ReplayIconProps = {
  name: ReplayIconName;
  size: number;
  className?: string;
};
