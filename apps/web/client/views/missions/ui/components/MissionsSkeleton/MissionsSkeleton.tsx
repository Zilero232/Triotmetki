import { Skeleton } from '@/ui-kit';

import { MISSIONS_SKELETON } from '../../../config';

import s from './MissionsSkeleton.module.scss';

export const MissionsSkeleton = () => (
  <div aria-busy className={s.root}>
    <Skeleton height={MISSIONS_SKELETON.headingHeight} shape='block' width={MISSIONS_SKELETON.headingWidth} />
    <div className={s.grid}>
      <Skeleton count={MISSIONS_SKELETON.cards} height={MISSIONS_SKELETON.cardHeight} shape='block' />
    </div>
  </div>
);
