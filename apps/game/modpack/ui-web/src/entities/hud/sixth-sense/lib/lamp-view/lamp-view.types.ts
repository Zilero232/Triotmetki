import type { CSSProperties } from 'react';

import type { HudTone } from '@/ui-kit';

export type LampView = {
  ring: number;
  progress: number;
  seconds: string;
  alpha: number;
  lit: boolean;
  tone: HudTone | null;
  color: CSSProperties | undefined;
};
