import type { Prisma } from '../../../../generated';

import { AUTHOR_SELECT } from '../../community-core';

export const BLOG_POST_INCLUDE = { author: { select: AUTHOR_SELECT } } as const;

export const BLOG_POST_ORDER = [{ publishedAt: 'desc' }, { id: 'desc' }] as const satisfies Prisma.BlogPostOrderByWithRelationInput[];
