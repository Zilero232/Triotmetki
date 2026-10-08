import type { PageHeaderSkeletonProps } from './PageHeaderSkeleton.types';

import { Skeleton } from '../../atoms';

import s from './PageHeaderSkeleton.module.scss';

export const PageHeaderSkeleton = ({ hasDescription = true }: PageHeaderSkeletonProps) => (
  <div aria-busy className={s.root}>
    <Skeleton className={s.crumbs} shape='block' />
    <Skeleton className={s.title} shape='block' />
    {hasDescription && <Skeleton className={s.description} shape='block' />}
  </div>
);
