import clsx from 'clsx';

import type { HudPlateProps } from './HudPlate.types';

import s from './HudPlate.module.scss';

export const HudPlate = ({ fill = 'solid', className, children }: HudPlateProps) => (
  <div className={clsx(s.plate, s[fill], className)}>{children}</div>
);
