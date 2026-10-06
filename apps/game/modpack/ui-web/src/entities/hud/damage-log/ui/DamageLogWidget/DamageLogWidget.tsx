import clsx from 'clsx';

import type { DamageLogWidgetProps } from './DamageLogWidget.types';

import { damageLogView } from '../../lib/damage-log-view';
import { DamageLogRow } from './components/DamageLogRow';
import { DamageLogTotals } from './components/DamageLogTotals';

import s from './DamageLogWidget.module.scss';

export const DamageLogWidget = ({ data }: DamageLogWidgetProps) => {
  const view = damageLogView(data);

  return (
    <div className={clsx(s.plate, view.wide && s.wide)}>
      {view.totals.length > 0 && <DamageLogTotals totals={view.totals} />}
      {view.sections.map((section, index) => (
        <div key={section.key} className={clsx(s.section, index > 0 && s.divided)}>
          {section.rows.map((row, rowIndex) => (
            <DamageLogRow key={row.id} isNewest={rowIndex === 0} row={row} />
          ))}
        </div>
      ))}
    </div>
  );
};
