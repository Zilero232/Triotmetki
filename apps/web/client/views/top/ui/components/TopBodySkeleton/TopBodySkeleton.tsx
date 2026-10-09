import { Card, PodiumSkeleton, Skeleton } from '@/ui-kit';

import { HALL_OF_FAME, TOP_BOARD, TOP_BODY_SKELETON } from '../../../config';

import s from './TopBodySkeleton.module.scss';

export const TopBodySkeleton = () => (
  <div aria-busy>
    <div className={s.strip} />
    <div className={s.content}>
      <PodiumSkeleton count={TOP_BOARD.podiumSize} {...TOP_BOARD.podiumSkeleton} />
      <Card padding='none'>
        <div className={s.filters} />
        <div className={s.body}>
          <Skeleton height={TOP_BODY_SKELETON.tableHeight} shape='block' />
        </div>
      </Card>
      <Card padding='none'>
        <div className={s.hallHeader} />
        <div className={s.body}>
          <Skeleton height={HALL_OF_FAME.skeletonHeight} shape='block' />
        </div>
      </Card>
    </div>
  </div>
);
