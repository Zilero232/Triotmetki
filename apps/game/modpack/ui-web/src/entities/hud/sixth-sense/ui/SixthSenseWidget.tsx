import clsx from 'clsx';

import { ClientIcon, RadialTimer, TabularText, toneClass } from '@/ui-kit';

import type { SixthSenseWidgetProps } from './SixthSenseWidget.types';

import { SIXTH_SENSE } from '../config';
import { lampLayout, rectStyle } from '../lib/lamp-layout';
import { lampView } from '../lib/lamp-view';

import s from './SixthSenseWidget.module.scss';

export const SixthSenseWidget = ({ data }: SixthSenseWidgetProps) => {
  const view = lampView(data);
  const layout = lampLayout({ ring: view.ring, text: Boolean(data.text), timer: data.timer });

  return (
    <div className={s.lamp} style={rectStyle(layout.box)}>
      <span className={clsx(s.ring, view.lit && s.lit)} style={{ ...rectStyle(layout.ring), opacity: view.alpha }}>
        <RadialTimer inner={data.size} progress={view.progress} size={view.ring} stroke={SIXTH_SENSE.ring.stroke} tone='accent'>
          <ClientIcon icon={data.icon} size={data.size} />
        </RadialTimer>
      </span>
      {layout.text && (
        <span className={clsx(s.row, s.text, toneClass(view.tone))} style={{ ...rectStyle(layout.text), ...view.color }}>
          {data.text}
        </span>
      )}
      {layout.seconds && (
        <span className={clsx(s.row, s.seconds, toneClass(view.tone))} style={{ ...rectStyle(layout.seconds), ...view.color }}>
          {view.seconds && <TabularText text={view.seconds} />}
        </span>
      )}
    </div>
  );
};
