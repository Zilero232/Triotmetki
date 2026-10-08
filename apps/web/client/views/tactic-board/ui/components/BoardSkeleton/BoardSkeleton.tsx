import { Skeleton } from '@/ui-kit';

import { BOARD_SKELETON } from '../../../config';

import s from './BoardSkeleton.module.scss';

export const BoardSkeleton = () => (
  <div aria-busy className={s.root}>
    <Skeleton height={BOARD_SKELETON.toolbarHeight} shape='block' />
    <div className={s.body}>
      <Skeleton height={BOARD_SKELETON.canvasHeight} shape='block' />
      <Skeleton height={BOARD_SKELETON.layersHeight} shape='block' />
    </div>
  </div>
);
