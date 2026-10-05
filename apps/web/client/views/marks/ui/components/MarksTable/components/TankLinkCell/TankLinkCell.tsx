import { TankCell } from '@/entities/tank/tank';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';

import type { TankLinkCellProps } from './TankLinkCell.types';

import s from './TankLinkCell.module.scss';

export const TankLinkCell = ({ vehicle }: TankLinkCellProps) => (
  <Link className={s.root} href={ROUTES.tanks.detail(vehicle.slug)}>
    <TankCell imageHideBelow='md' vehicle={vehicle} />
  </Link>
);
