import clsx from 'clsx';

import type { ToggleProps } from './Toggle.types';

import s from './Toggle.module.scss';

export const Toggle = ({ on, label, onToggle }: ToggleProps) => (
  <button aria-checked={on} aria-label={label} className={clsx(s.toggle, on && s.toggleOn)} role='switch' type='button' onClick={onToggle}>
    <span className={clsx(s.knob, on && s.knobOn)} />
  </button>
);
