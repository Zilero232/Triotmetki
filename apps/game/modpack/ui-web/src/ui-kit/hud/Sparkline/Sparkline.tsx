import clsx from 'clsx';

import { HUD_FIGURE, HUD_TONE_COLORS } from '@/shared/config';
import { remBox } from '@/shared/lib/css-unit';
import { dotPath, sparkline } from '@/shared/lib/sparkline';

import type { SparklineProps } from './Sparkline.types';

import s from './Sparkline.module.scss';

export const Sparkline = ({ points, width, height, className }: SparklineProps) => {
  const view = sparkline({ points, width, height, inset: HUD_FIGURE.sparkInset });

  if (view.last === null) {
    return null;
  }

  return (
    <span className={clsx(s.spark, className)} style={remBox({ width, height })}>
      <svg aria-hidden='true' height='100%' viewBox={`0 0 ${String(width)} ${String(height)}`} width='100%' xmlns='http://www.w3.org/2000/svg'>
        <path d={view.path} fill='none' stroke={HUD_TONE_COLORS.muted.hex} strokeLinejoin='round' strokeWidth={1.5} />
        <path d={dotPath({ x: view.last.x, y: view.last.y, radius: HUD_FIGURE.sparkDot })} fill={HUD_FIGURE.index} />
      </svg>
    </span>
  );
};
