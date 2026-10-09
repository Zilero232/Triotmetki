import { clsx } from 'clsx';
import dynamic from 'next/dynamic';

import type { SparklineProps } from './Sparkline.types';

import s from './Sparkline.module.scss';

const SparklinePaths = dynamic(() => import('./components').then((module) => module.SparklinePaths));

export const Sparkline = ({ data, width = 120, height = 36, tone = 'accent', withArea = false, label, className }: SparklineProps) => (
  <svg
    aria-label={label}
    className={clsx(s.root, className)}
    data-tone={tone}
    height={height}
    role={label ? 'img' : undefined}
    viewBox={`0 0 ${width} ${height}`}
    width={width}
  >
    <SparklinePaths data={data} height={height} width={width} withArea={withArea} />
  </svg>
);
