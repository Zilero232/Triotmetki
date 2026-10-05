import clsx from 'clsx';

import type { ReplayIconProps } from './ReplayIcon.types';

import { REPLAY_ICONS } from '../../../config';

import s from './ReplayIcon.module.scss';

export const ReplayIcon = ({ name, size, className }: ReplayIconProps) => (
  <span aria-hidden='true' className={clsx(s.icon, className)} style={{ width: `${size}rem`, height: `${size}rem` }}>
    <svg height='100%' viewBox={`0 0 ${REPLAY_ICONS.viewBox} ${REPLAY_ICONS.viewBox}`} width='100%' xmlns='http://www.w3.org/2000/svg'>
      {REPLAY_ICONS.paths[name].map((d) => (
        <path key={d} d={d} fill='currentColor' />
      ))}
    </svg>
  </span>
);
