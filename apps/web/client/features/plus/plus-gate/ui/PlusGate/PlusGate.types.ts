import type { ReactNode } from 'react';

import type { PlusTeaserFeature } from '../../config';

export type PlusGateProps = {
  feature: PlusTeaserFeature;
  children: ReactNode;
  fallback?: ReactNode;
};
