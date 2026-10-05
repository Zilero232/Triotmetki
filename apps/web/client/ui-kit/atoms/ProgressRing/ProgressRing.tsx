'use client';

import { Progress } from '@base-ui/react/progress';
import { clsx } from 'clsx';
import { useLocale } from 'next-intl';

import { ringGeometry, useScrollReveal } from '@/shared/lib';

import type { ProgressRingProps } from './ProgressRing.types';

import s from './ProgressRing.module.scss';

export const ProgressRing = ({
  value,
  max = 100,
  size = 48,
  thickness = 3,
  tone = 'accent',
  marks,
  label,
  children,
  className
}: ProgressRingProps) => {
  const locale = useLocale();
  const ref = useScrollReveal<HTMLDivElement>();

  const { ratio, radius, center } = ringGeometry({ value, max, size, thickness });

  return (
    <Progress.Root
      ref={ref}
      aria-label={label}
      className={clsx(s.root, className)}
      data-marks={marks}
      data-tone={tone}
      locale={locale}
      max={max}
      style={{ width: size, height: size }}
      value={value}
    >
      <svg aria-hidden className={s.svg} height={size} viewBox={`0 0 ${size} ${size}`} width={size}>
        <circle className={s.track} cx={center} cy={center} r={radius} strokeWidth={thickness} />
        <circle
          className={s.indicator}
          cx={center}
          cy={center}
          data-ratio={ratio}
          pathLength={1}
          r={radius}
          strokeDasharray={`${ratio} 1`}
          strokeWidth={thickness}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </svg>
      <div className={s.content}>{children}</div>
    </Progress.Root>
  );
};
