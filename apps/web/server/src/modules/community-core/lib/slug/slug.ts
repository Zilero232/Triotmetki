import slugify from '@sindresorhus/slugify';

import type { TitleSlugInput } from './slug.types';

import { TITLE_SLUG } from '../../config/slug.constants';

export const titleSlug = ({ title, suffix }: TitleSlugInput): string =>
  `${slugify(title).slice(0, TITLE_SLUG.maxLength) || TITLE_SLUG.fallback}-${suffix}`;
