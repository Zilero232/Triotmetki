import clsx from 'clsx';

import type { ModulePickerProps } from './ModulePicker.types';

import { modulesPick } from '../../../../../lib/modules-pick';

import s from './ModulePicker.module.scss';

export const ModulePicker = ({ labels, modules, onPick }: ModulePickerProps) => (
  <div className={s.modules}>
    <span className={s.caption}>{labels.turret}</span>
    <div className={s.chips}>
      {modules.turrets.map((turret) => (
        <button
          key={turret.cd}
          aria-pressed={turret.active}
          className={clsx(s.chip, turret.active && s.chipOn)}
          type='button'
          onClick={() => onPick(modulesPick({ modules, turret: turret.cd }))}
        >
          {turret.label}
        </button>
      ))}
    </div>
    <span className={s.caption}>{labels.gun}</span>
    <div className={s.chips}>
      {modules.guns.map((gun) => (
        <button
          key={gun.cd}
          aria-pressed={gun.active}
          className={clsx(s.chip, gun.active && s.chipOn)}
          type='button'
          onClick={() => onPick(modulesPick({ modules, gun: gun.cd }))}
        >
          {gun.label}
        </button>
      ))}
    </div>
  </div>
);
