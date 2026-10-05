import clsx from 'clsx';

import { barFill } from '@/shared/lib/bar-fill';

import type { CardRowProgressProps } from './CardRowProgress.types';

import s from './CardRowProgress.module.scss';

export const CardRowProgress = ({ progress, tone, className }: CardRowProgressProps) => {
  if (progress === null) {
    return null;
  }

  return (
    <div className={clsx(s.track, className)}>
      <div className={clsx(s.fill, s[tone])} style={{ width: `${String(barFill({ value: progress, max: 1, width: 100 }))}%` }} />
    </div>
  );
};
