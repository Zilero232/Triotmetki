import { clsx } from 'clsx';

import { Skeleton } from '@/ui-kit';

import type { StreamerSkeletonProps } from './StreamerSkeleton.types';

import { STREAMER_SKELETON } from '../../../config';

import s from './StreamerSkeleton.module.scss';

export const StreamerSkeleton = ({ isPage = false }: StreamerSkeletonProps) => (
  <div aria-busy className={clsx(s.root, isPage && s.page)}>
    <Skeleton height={STREAMER_SKELETON.heroHeight} shape='block' />
    <Skeleton height={STREAMER_SKELETON.liveHeight} shape='block' />
    <Skeleton height={STREAMER_SKELETON.statsHeight} shape='block' />
  </div>
);
