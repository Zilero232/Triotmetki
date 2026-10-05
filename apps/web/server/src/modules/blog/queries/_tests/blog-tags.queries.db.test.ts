import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { blogTagCounts } from '../blog-tags.queries';

const post = ({ slug, tags, status = 'published' }: { slug: string; tags: string[]; status?: 'draft' | 'published' }) => ({
  slug,
  title: `Post ${slug}`,
  excerpt: 'An excerpt long enough',
  body: 'A body',
  category: 'updates' as const,
  tags,
  status
});

describeWithDatabase('blogTagCounts', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['blog_post'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('counts the tags of published posts, most used first, then by name', async () => {
    await prisma.blogPost.createMany({
      data: [
        post({ slug: 'one', tags: ['patch', 'maps'] }),
        post({ slug: 'two', tags: ['patch', 'tanks'] }),
        post({ slug: 'three', tags: ['arty'] }),
        post({ slug: 'four', tags: ['patch', 'drafts'], status: 'draft' })
      ]
    });

    expect(await blogTagCounts({ db: prisma.$kysely, limit: 3 })).toEqual([
      { tag: 'patch', count: 2 },
      { tag: 'arty', count: 1 },
      { tag: 'maps', count: 1 }
    ]);
  });
});
