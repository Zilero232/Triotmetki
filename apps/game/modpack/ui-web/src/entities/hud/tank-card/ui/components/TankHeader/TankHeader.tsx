import { romanTier } from '@/shared/lib/format-number';
import { ClientIcon, HudText, IndexMark } from '@/ui-kit';

import type { TankHeaderProps } from './TankHeader.types';

import { TANK_CARD } from '../../../config';

import s from './TankHeader.module.scss';

export const TankHeader = ({ data }: TankHeaderProps) => (
  <div className={s.header}>
    <ClientIcon className={s.icon} icon={data.class_icon} size={TANK_CARD.classIcon} tone='muted' />
    <HudText className={s.tier} text={romanTier(data.tier)} />
    <HudText className={s.name} text={data.vehicle} />
    {data.percent !== null && <IndexMark className={s.marks} lit={data.marks} />}
  </div>
);
