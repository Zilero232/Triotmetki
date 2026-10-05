import clsx from 'clsx';

import { toneClass } from '@/ui-kit';

import type { GunArcWidgetProps } from './GunArcWidget.types';

import { GUN_ARC } from '../config';
import { arcView } from '../lib/arc-view';

import s from './GunArcWidget.module.scss';

export const GunArcWidget = ({ data }: GunArcWidgetProps) => {
  const view = arcView(data);

  return (
    <div className={s.arc}>
      {data.left && <span className={clsx(s.degrees, toneClass(data.left_tone))}>‹ {data.left}</span>}
      {data.scale && (
        <div className={s.scale} style={{ width: `${GUN_ARC.scale.width}rem` }}>
          <div className={s.track} />
          <div className={clsx(s.limit, s.start, s[data.left_tone])} />
          <div className={s.centre} style={{ left: `${view.centre}rem` }} />
          <div className={clsx(s.dot, s[data.gun_tone])} style={{ left: `${view.gun}rem` }} />
          <div className={clsx(s.limit, s.end, s[data.right_tone])} />
        </div>
      )}
      {data.right && <span className={clsx(s.degrees, toneClass(data.right_tone))}>{data.right} ›</span>}
      {data.yaw && <span className={s.yaw}>{data.yaw}</span>}
    </div>
  );
};
