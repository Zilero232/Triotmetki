import clsx from 'clsx';

import { ClientIcon, HudPlate, MiniBar } from '@/ui-kit';

import type { PlatoonPointsWidgetProps } from './PlatoonPointsWidget.types';

import { PLATOON_POINTS } from '../config';

import s from './PlatoonPointsWidget.module.scss';

export const PlatoonPointsWidget = ({ data }: PlatoonPointsWidgetProps) => (
  <HudPlate className={s.plate}>
    <div className={s.header}>
      <span className={s.title}>{data.title}</span>
      <span className={s.total}>{data.total}</span>
    </div>
    {data.rows.map((row) => (
      <div key={row.name} className={clsx(s.row, !row.alive && s.dead)}>
        <ClientIcon native icon={row.cls} size={PLATOON_POINTS.iconSize} />
        <div className={s.member}>
          <span className={clsx(s.name, row.own && s.own)}>{row.name}</span>
          <MiniBar height={PLATOON_POINTS.bar.height} max={row.max} tone='ally' value={row.hp} width={PLATOON_POINTS.bar.width} />
        </div>
        <span className={s.frags}>{row.frags_text}</span>
        <span className={s.points}>{row.points}</span>
      </div>
    ))}
  </HudPlate>
);
