import { clsx } from 'clsx';

import { Skeleton } from '@/ui-kit';

import type { BlogPostSkeletonProps } from './BlogPostSkeleton.types';

import { BLOG_POST_SKELETON } from '../../../config';

import s from './BlogPostSkeleton.module.scss';

export const BlogPostSkeleton = ({ isPage = false }: BlogPostSkeletonProps) => (
  <div aria-busy className={clsx(s.root, isPage && s.page)}>
    <Skeleton height={BLOG_POST_SKELETON.heroHeight} shape='block' />
    <div className={s.layout}>
      <Skeleton height={BLOG_POST_SKELETON.bodyHeight} shape='block' />
      <Skeleton height={BLOG_POST_SKELETON.asideHeight} shape='block' />
    </div>
  </div>
);
