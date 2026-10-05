import type { ReactNode } from 'react';

import type { UiIconName } from '@/shared/lib/icon-sprite';

export type EmptyProps = {
  children: ReactNode;
  icon?: UiIconName;
};
