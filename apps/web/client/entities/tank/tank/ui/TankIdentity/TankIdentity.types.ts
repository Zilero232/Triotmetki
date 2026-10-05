import type { TankImageSize } from '@/ui-kit';

import type { TankIdentityData } from '../../model/tank.types';

export type TankIdentityProps = {
  tank: TankIdentityData;
  size?: 'lg' | 'md';
  withNation?: boolean;
  image?: Exclude<TankImageSize, 'big'>;
  imageHideBelow?: 'md';
  className?: string;
};
