import type { HudTone } from '../tone';

export type ClientIconProps = {
  icon: string | null | undefined;
  size: number;
  width?: number;
  native?: boolean;
  tone?: HudTone | null;
  className?: string;
};
