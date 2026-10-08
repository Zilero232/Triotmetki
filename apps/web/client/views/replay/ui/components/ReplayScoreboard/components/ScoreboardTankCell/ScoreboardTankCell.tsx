import { TankLink } from '@/entities/tank/tank';

import type { ScoreboardTankCellProps } from './ScoreboardTankCell.types';

import s from './ScoreboardTankCell.module.scss';

export const ScoreboardTankCell = ({ vehicle }: ScoreboardTankCellProps) =>
  vehicle ? <TankLink vehicle={vehicle} /> : <span className={s.unknown}>—</span>;
