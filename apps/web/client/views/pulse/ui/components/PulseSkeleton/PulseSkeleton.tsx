import { Skeleton } from '@/ui-kit';

import { PULSE_SKELETON } from '../../../config';

import s from './PulseSkeleton.module.scss';

export const PulseSkeleton = () => (
  <div aria-busy className={s.root}>
    <div className={s.figures}>
      <Skeleton count={PULSE_SKELETON.figures} height={PULSE_SKELETON.figureHeight} shape='block' />
    </div>
    <Skeleton height={PULSE_SKELETON.heatHeight} shape='block' />
    <Skeleton height={PULSE_SKELETON.queueHeight} shape='block' />
    <Skeleton height={PULSE_SKELETON.chartHeight} shape='block' />
  </div>
);
