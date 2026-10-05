import type { ReactNode } from 'react';

import type { UseHudSampleInput } from '../../model/hooks/use-hud-sample';

export type HudSampleProps = UseHudSampleInput & {
  className?: string;
  scale?: number;
  minScale?: number;
  fallback?: ReactNode;
};
