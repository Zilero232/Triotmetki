import clsx from 'clsx';

import { ClientIcon, HudPlate, toneClass } from '@/ui-kit';

import type { ClockStripWidgetProps } from './ClockStripWidget.types';

import s from './ClockStripWidget.module.scss';

export const ClockStripWidget = ({ data }: ClockStripWidgetProps) => (
  <HudPlate fill='centre'>
    <div className={s.strip}>
      <ClientIcon icon={data.icon} size={16} />
      <span className={s.time}>{data.time}</span>
      {data.date && <span className={s.date}>{data.date}</span>}
      {data.server && <span className={clsx(s.group, s.server)}>{data.server}</span>}
      {data.ping && (
        <span className={clsx(s.group, s.ping, toneClass(data.ping_tone))}>
          <ClientIcon icon={data.ping_icon} size={14} tone={data.ping_tone} />
          <span className={s.value}>{data.ping}</span>
        </span>
      )}
      {data.online && (
        <span className={s.group}>
          <span className={s.label}>{data.online_label}</span>
          <span className={s.value}>{data.online}</span>
        </span>
      )}
    </div>
  </HudPlate>
);
