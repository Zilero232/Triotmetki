import clsx from 'clsx';

import type { SparklineProps } from './Sparkline.types';

import { HUD_FIGURE, HUD_TONE_COLORS } from '../../../config';
import { sparkline } from '../../../lib/hud-sparkline';

import s from './Sparkline.module.scss';

export const Sparkline = ({ points, width, height, className }: SparklineProps) => {
  const view = sparkline({ points, width, height, inset: HUD_FIGURE.sparkInset });

  if (view.last === null) {
    return null;
  }

  return (
    <span className={clsx(s.spark, className)} style={{ width: `${String(width)}rem`, height: `${String(height)}rem` }}>
      <svg aria-hidden='true' height='100%' viewBox={`0 0 ${String(width)} ${String(height)}`} width='100%' xmlns='http://www.w3.org/2000/svg'>
        <path d={view.path} fill='none' stroke={HUD_TONE_COLORS.muted.hex} strokeLinejoin='round' strokeWidth={1.5} />
        <circle cx={view.last.x} cy={view.last.y} fill={HUD_FIGURE.index} r={HUD_FIGURE.sparkDot} />
      </svg>
    </span>
  );
};
