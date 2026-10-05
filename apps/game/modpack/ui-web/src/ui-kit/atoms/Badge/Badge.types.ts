import type { ReactNode } from 'react';

import type { UiIconName } from '@/shared/lib/icon-sprite';

export type BadgeTone = 'accent' | 'default' | 'gold';

export type BadgeProps = {
  tone?: BadgeTone;
  icon?: UiIconName;
  children: ReactNode;
};
