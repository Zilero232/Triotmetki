import { Skeleton } from '@/ui-kit';

import { REPLAY_SKELETON } from '../../../config';

import s from './ReplaySkeleton.module.scss';

export const ReplaySkeleton = () => (
  <div aria-busy className={s.root}>
    <Skeleton height={REPLAY_SKELETON.overviewHeight} shape='block' />
    <Skeleton height={REPLAY_SKELETON.scoreboardHeight} shape='block' />
    <div className={s.grid}>
      <Skeleton height={REPLAY_SKELETON.timelineHeight} shape='block' />
      <Skeleton height={REPLAY_SKELETON.heatmapHeight} shape='block' />
    </div>
  </div>
);
