import { Skeleton } from '@/ui-kit';

import { MARKS_BODY_SKELETON } from '../../../config';

import s from './MarksBodySkeleton.module.scss';

export const MarksBodySkeleton = () => (
  <div aria-busy>
    <Skeleton className={s.band} height={MARKS_BODY_SKELETON.bandHeight} shape='block' />
    <div className={s.main}>
      <Skeleton height={MARKS_BODY_SKELETON.toolbarHeight} shape='block' />
      <Skeleton height={MARKS_BODY_SKELETON.tableHeight} shape='block' />
    </div>
  </div>
);
