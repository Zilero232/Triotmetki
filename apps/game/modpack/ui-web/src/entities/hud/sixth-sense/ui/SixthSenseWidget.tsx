import clsx from 'clsx';

import { ClientIcon, RadialTimer, toneClass } from '@/ui-kit';

import type { SixthSenseWidgetProps } from './SixthSenseWidget.types';

import { SIXTH_SENSE } from '../config';
import { lampView } from '../lib/lamp-view';

import s from './SixthSenseWidget.module.scss';

export const SixthSenseWidget = ({ data }: SixthSenseWidgetProps) => {
  const view = lampView(data);
  const column = { width: `${String(view.ring)}rem` };

  return (
    <div className={s.lamp}>
      <div className={clsx(s.ring, view.lit && s.lit)} style={{ ...column, height: `${String(view.ring)}rem`, opacity: view.alpha }}>
        <RadialTimer inner={data.size} progress={view.progress} size={view.ring} stroke={SIXTH_SENSE.ring.stroke} tone='accent'>
          <ClientIcon icon={data.icon} size={data.size} />
        </RadialTimer>
      </div>
      {data.text && (
        <span className={clsx(s.text, toneClass(view.tone))} style={view.color}>
          {data.text}
        </span>
      )}
      {view.seconds && (
        <span className={clsx(s.seconds, toneClass(view.tone))} style={{ ...view.color, ...column }}>
          {view.seconds}
        </span>
      )}
    </div>
  );
};
