import slugify from '@sindresorhus/slugify';
import { isIncludedIn } from 'remeda';

import type { BlogSlugInput, UniqueBlogSlugInput } from './blog-slug.types';

import { BLOG } from '../../config/blog.constants';

const trimSlug = (value: string, max: number): string => value.slice(0, max).replace(/-+$/u, '');

export const blogSlug = ({ title, slug }: BlogSlugInput): string => {
  const base = trimSlug(slug ?? slugify(title), BLOG.slugMaxLength) || BLOG.slugFallback;

  return isIncludedIn(base, BLOG.reservedSlugs) ? `${base}-${BLOG.slugFallback}` : base;
};

export const uniqueBlogSlug = ({ base, suffix }: UniqueBlogSlugInput): string =>
  `${trimSlug(base, BLOG.slugMaxLength - suffix.length - 1)}-${suffix}`;
