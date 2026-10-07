import { HUD_FIGURE, HUD_TONE_COLORS } from '@/shared/config';
import { remRect, remSquare } from '@/shared/lib/css-unit';
import { radialArc } from '@/shared/lib/radial';

import type { RadialTimerProps } from './RadialTimer.types';

import s from './RadialTimer.module.scss';

export const RadialTimer = ({ progress, size, stroke, inner, tone = 'accent', children }: RadialTimerProps) => {
  const centre = size / 2;
  const radius = centre - stroke;
  const track = radialArc({ progress: 1, radius, centre });
  const arc = radialArc({ progress, radius, centre });
  const box = remSquare(size);
  const offset = (size - inner) / 2;
  const innerBox = remRect({ left: offset, top: offset, width: inner, height: inner });

  return (
    <div className={s.radial} style={box}>
      <span className={s.layer} style={box}>
        <svg
          aria-hidden='true'
          className={s.svg}
          height='100%'
          viewBox={`0 0 ${String(size)} ${String(size)}`}
          width='100%'
          xmlns='http://www.w3.org/2000/svg'
        >
          <path d={track} fill='none' stroke={HUD_FIGURE.empty.color} strokeOpacity={HUD_FIGURE.empty.opacity} strokeWidth={stroke} />
          {arc && <path d={arc} fill='none' stroke={HUD_TONE_COLORS[tone].hex} strokeWidth={stroke} />}
        </svg>
      </span>
      <span className={s.content} style={innerBox}>
        {children}
      </span>
    </div>
  );
};
