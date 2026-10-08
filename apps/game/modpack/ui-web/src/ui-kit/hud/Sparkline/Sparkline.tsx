import clsx from 'clsx';

import { HUD_FIGURE, HUD_TONE_COLORS } from '@/shared/config';
import { remBox } from '@/shared/lib/css-unit';
import { RADIAL } from '@/shared/lib/radial';
import { dotPath, sparkline } from '@/shared/lib/sparkline';

import type { SparklineProps } from './Sparkline.types';

import s from './Sparkline.module.scss';

export const Sparkline = ({ points, width, height, className }: SparklineProps) => {
  const view = sparkline({ points, width, height, inset: HUD_FIGURE.sparkInset });
  const dot = view.last === null ? RADIAL.emptyPath : dotPath({ x: view.last.x, y: view.last.y, radius: HUD_FIGURE.sparkDot });

  return (
    <span className={clsx(s.spark, view.last === null && s.idle, className)} style={remBox({ width, height })}>
      <svg
        aria-hidden='true'
        className={s.svg}
        height='100%'
        viewBox={`0 0 ${String(width)} ${String(height)}`}
        width='100%'
        xmlns='http://www.w3.org/2000/svg'
      >
        <path d={view.path || RADIAL.emptyPath} fill='none' stroke={HUD_TONE_COLORS.muted.hex} strokeLinejoin='round' strokeWidth={1.5} />
        <path d={dot} fill={HUD_FIGURE.index} />
      </svg>
    </span>
  );
};
