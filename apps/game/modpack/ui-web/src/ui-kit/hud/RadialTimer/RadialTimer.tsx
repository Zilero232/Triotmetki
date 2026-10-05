import { HUD_FIGURE, HUD_TONE_COLORS } from '@/shared/config';
import { radialArc } from '@/shared/lib/radial';

import type { RadialTimerProps } from './RadialTimer.types';

import s from './RadialTimer.module.scss';

export const RadialTimer = ({ progress, size, stroke, inner, tone = 'accent', children }: RadialTimerProps) => {
  const centre = size / 2;
  const radius = centre - stroke;
  const arc = radialArc({ progress, radius, centre });
  const box = { width: `${String(size)}rem`, height: `${String(size)}rem` };
  const offset = `${String((size - inner) / 2)}rem`;
  const innerBox = { top: offset, left: offset, width: `${String(inner)}rem`, height: `${String(inner)}rem` };

  return (
    <div className={s.radial} style={box}>
      <span className={s.layer} style={box}>
        <svg
          aria-hidden='true'
          height='100%'
          style={box}
          viewBox={`0 0 ${String(size)} ${String(size)}`}
          width='100%'
          xmlns='http://www.w3.org/2000/svg'
        >
          <circle
            cx={centre}
            cy={centre}
            fill='none'
            r={radius}
            stroke={HUD_FIGURE.empty.color}
            strokeOpacity={HUD_FIGURE.empty.opacity}
            strokeWidth={stroke}
          />
          {arc && <path d={arc} fill='none' stroke={HUD_TONE_COLORS[tone].hex} strokeWidth={stroke} />}
        </svg>
      </span>
      <span className={s.content} style={innerBox}>
        {children}
      </span>
    </div>
  );
};
