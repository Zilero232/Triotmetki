import { clsx } from 'clsx';

import type { TankCellProps } from './TankCell.types';

import { vehicleIdentity } from '../../lib/vehicle-identity';
import { TankIdentity } from '../TankIdentity';

import s from './TankCell.module.scss';

export const TankCell = ({ vehicle, image = 'small', imageHideBelow, className }: TankCellProps) => {
  const tank = vehicleIdentity(vehicle);

  return (
    <span className={clsx(s.root, className)} data-nation={tank.nation}>
      <TankIdentity image={image} imageHideBelow={imageHideBelow} tank={tank} withNation={false} />
    </span>
  );
};
