import type { CSSProperties } from 'react';

import type { HudTone } from '../../../../../shared/ui/hud';

export type LampView = {
  ring: number;
  progress: number;
  seconds: string;
  alpha: number;
  lit: boolean;
  tone: HudTone | null;
  color: CSSProperties | undefined;
};
