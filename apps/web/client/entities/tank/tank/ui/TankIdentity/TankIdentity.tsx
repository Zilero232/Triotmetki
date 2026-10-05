import { clsx } from 'clsx';

import { ClassIcon, NationLabel, TankImage, TierNumeral } from '@/ui-kit';

import type { TankIdentityProps } from './TankIdentity.types';

import { TANK_IDENTITY } from '../../config';

import s from './TankIdentity.module.scss';

export const TankIdentity = ({ tank, size = 'md', withNation = true, image, imageHideBelow, className }: TankIdentityProps) => {
  const icons = TANK_IDENTITY.iconSize[size];

  return (
    <span className={clsx(s.root, s[size], className)} data-image-hide-below={imageHideBelow} data-premium={tank.isPremium}>
      {image && <TankImage isDecorative className={s.image} size={image} tank={tank} />}
      <ClassIcon className={s.class} size={icons.class} tankClass={tank.type} variant={tank.isPremium ? 'premium' : 'regular'} />
      <TierNumeral className={s.tier} tier={tank.tier} />
      <span className={s.name}>{tank.name}</span>
      {withNation && <NationLabel className={s.nation} nation={tank.nation} size={icons.nation} withName={false} />}
    </span>
  );
};
