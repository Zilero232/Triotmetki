import type { BlogTagCountsInput } from './blog-tags.types';

export const blogTagCounts = ({ db, limit }: BlogTagCountsInput) =>
  db
    .selectFrom('blog_post')
    .innerJoinLateral(
      (eb) => eb.fn<{ tag: string }>('unnest', ['blog_post.tags']).as('tag'),
      (join) => join.onTrue()
    )
    .select((eb) => ['tag.tag', eb.fn.countAll<number>().as('count')])
    .where('blog_post.status', '=', 'published')
    .groupBy('tag.tag')
    .orderBy('count', 'desc')
    .orderBy('tag.tag')
    .limit(limit)
    .execute();

export const BLOG_TAGS_QUERIES = { blogTagCounts } as const;
