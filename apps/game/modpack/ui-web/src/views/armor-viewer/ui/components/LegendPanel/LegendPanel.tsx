import clsx from 'clsx';

import { ArmorScale } from '@/entities/armor/armor-map';
import { toneClass } from '@/ui-kit';

import type { LegendPanelProps } from './LegendPanel.types';

import s from './LegendPanel.module.scss';

export const LegendPanel = ({ label, legend, status }: LegendPanelProps) => (
  <div className={s.panel}>
    <span className={s.caption}>{label}</span>
    <ArmorScale legend={legend} />
    {status && (
      <div className={s.status}>
        <span className={clsx(s.text, toneClass(status.tone))}>{status.text}</span>
        {status.progress !== null && (
          <div className={s.bar}>
            <div className={s.fill} style={{ width: `${String(status.progress * 100)}%` }} />
          </div>
        )}
      </div>
    )}
  </div>
);
