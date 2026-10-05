import clsx from 'clsx';

import { HudPlate, toneClass } from '@/ui-kit';

import type { AimArmorWidgetProps } from './AimArmorWidget.types';

import s from './AimArmorWidget.module.scss';

export const AimArmorWidget = ({ data }: AimArmorWidgetProps) => (
  <HudPlate className={s.plate} fill='centre'>
    <span className={clsx(s.value, toneClass(data.tone))}>{data.value}</span>
    {!data.ricochet && <span className={s.unit}>{data.nominal ? `/ ${data.nominal} ${data.unit}` : data.unit}</span>}
    {data.piercing && (
      <span className={s.extra}>
        {data.piercing_label}
        <span className={s.number}>{data.piercing}</span>
      </span>
    )}
    {data.angle && <span className={s.extra}>{data.angle}</span>}
  </HudPlate>
);
