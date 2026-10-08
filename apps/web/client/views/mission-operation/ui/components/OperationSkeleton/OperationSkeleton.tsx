import { Skeleton } from '@/ui-kit';

import { OPERATION_SKELETON } from '../../../config';

import s from './OperationSkeleton.module.scss';

export const OperationSkeleton = () => (
  <div aria-busy className={s.root}>
    <Skeleton height={OPERATION_SKELETON.figuresHeight} shape='block' />
    <Skeleton height={OPERATION_SKELETON.boardHeight} shape='block' />
    <Skeleton height={OPERATION_SKELETON.detailHeight} shape='block' />
    <Skeleton height={OPERATION_SKELETON.planHeight} shape='block' />
  </div>
);
