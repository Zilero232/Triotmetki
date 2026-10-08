import clsx from 'clsx';

import type { LegendChoicesProps } from './LegendChoices.types';

import s from './LegendChoices.module.scss';

export const LegendChoices = ({ modes, shells, attacker }: LegendChoicesProps) => (
  <div className={s.choices}>
    <div className={s.row}>
      {modes.map((mode) => (
        <span key={mode.key} className={clsx(s.choice, mode.active && s.active)}>
          <span className={s.key}>{mode.key}</span>
          {mode.label}
        </span>
      ))}
    </div>
    {attacker && <span className={s.attacker}>{attacker}</span>}
    {shells.length > 0 && (
      <div className={s.row}>
        {shells.map((shell, index) => (
          <span key={`${String(index)}-${shell.label}`} className={clsx(s.choice, shell.active && s.active)}>
            {shell.label}
          </span>
        ))}
      </div>
    )}
  </div>
);
