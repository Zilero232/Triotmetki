import { Skeleton } from '@/ui-kit';

import { TOP_BODY_SKELETON } from '../../../config';

import s from './TopBodySkeleton.module.scss';

export const TopBodySkeleton = () => (
  <div aria-busy>
    <div className={s.strip} />
    <div className={s.content}>
      <Skeleton height={TOP_BODY_SKELETON.podiumHeight} shape='block' />
      <Skeleton height={TOP_BODY_SKELETON.tableHeight} shape='block' />
    </div>
  </div>
);
