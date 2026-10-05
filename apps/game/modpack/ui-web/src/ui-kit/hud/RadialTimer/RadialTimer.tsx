import clsx from 'clsx';

import { radialDash } from '@/shared/lib/radial';

import type { RadialTimerProps } from './RadialTimer.types';

import { toneClass } from '../tone';

import s from './RadialTimer.module.scss';

export const RadialTimer = ({ progress, size, stroke, tone = 'accent', children }: RadialTimerProps) => {
  const centre = size / 2;
  const radius = centre - stroke;
  const { dasharray, dashoffset } = radialDash({ progress, radius });

  return (
    <div className={s.radial} style={{ width: `${size}rem`, height: `${size}rem` }}>
      <span className={clsx(s.ring, toneClass(tone))}>
        <svg aria-hidden='true' height='100%' viewBox={`0 0 ${size} ${size}`} width='100%' xmlns='http://www.w3.org/2000/svg'>
          <circle className={s.track} cx={centre} cy={centre} fill='none' r={radius} stroke='currentColor' strokeWidth={stroke} />
          <circle
            cx={centre}
            cy={centre}
            fill='none'
            r={radius}
            stroke='currentColor'
            strokeDasharray={dasharray}
            strokeDashoffset={dashoffset}
            strokeWidth={stroke}
            transform={`rotate(-90 ${centre} ${centre})`}
          />
        </svg>
      </span>
      <div className={s.content}>{children}</div>
    </div>
  );
};
