import clsx from 'clsx';

import { HudPlate, IconNumber } from '@/ui-kit';

import type { DamageLogWidgetProps } from './DamageLogWidget.types';

import { damageLogView } from '../../lib/damage-log-view';
import { DamageLogRow } from './components/DamageLogRow';

import s from './DamageLogWidget.module.scss';

export const DamageLogWidget = ({ data }: DamageLogWidgetProps) => {
  const view = damageLogView(data);

  return (
    <HudPlate className={clsx(s.plate, view.wide && s.wide)} fill='edge'>
      {view.totals.length > 0 && (
        <div className={s.totals}>
          {view.totals.map((total) => (
            <IconNumber key={total.key} icon={total.icon} tone={total.tone} value={total.text} />
          ))}
        </div>
      )}
      {view.sections.map((section, index) => (
        <div key={section.key} className={clsx(s.section, (index > 0 || view.totals.length > 0) && s.divided)}>
          {section.rows.map((row, rowIndex) => (
            <DamageLogRow key={row.id} isNewest={rowIndex === 0} row={row} />
          ))}
        </div>
      ))}
    </HudPlate>
  );
};
