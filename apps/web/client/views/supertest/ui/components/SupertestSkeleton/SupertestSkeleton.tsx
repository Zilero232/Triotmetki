import { Skeleton } from '@/ui-kit';

import { SUPERTEST_SKELETON } from '../../../config';

import s from './SupertestSkeleton.module.scss';

export const SupertestSkeleton = () => (
  <div aria-busy className={s.root}>
    <Skeleton count={SUPERTEST_SKELETON.cards} height={SUPERTEST_SKELETON.cardHeight} shape='block' />
  </div>
);
