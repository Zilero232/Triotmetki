import type { BlogArticle, BlogPostPage, BlogPostSummary, BlogTagCount } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';

import type { Prisma } from '../../../../generated';
import type { BlogPostsQuery } from '../blog.types';
import type { BlogTagsQueries } from '../queries/blog-tags.types';
import type { BlogPostRow } from '../selects/blog-post.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { paginate } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { PrismaService } from '../../../core';
import { BLOG } from '../config/blog.constants';
import { BLOG_QUERY_TOKENS } from '../config/queries.constants';
import { toBlogPostSummary, toBlogPostView } from '../mappers/blog-post-view.mappers';
import { BLOG_POST_INCLUDE, BLOG_POST_ORDER } from '../selects/blog-post.selects';

@Injectable()
export class BlogReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Inject(BLOG_QUERY_TOKENS.tags) private readonly queries: BlogTagsQueries
  ) {}

  async list({ category, tag, locale, isFeatured, limit, offset }: BlogPostsQuery): Promise<BlogPostPage> {
    const where: Prisma.BlogPostWhereInput = {
      status: 'published',
      ...(category ? { category } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(locale ? { locale } : {}),
      ...(isFeatured === undefined ? {} : { isFeatured })
    };

    return paginate({
      limit,
      offset,
      fetch: async (window) => {
        const rows = await this.prisma.blogPost.findMany({ where, orderBy: [...BLOG_POST_ORDER], ...window, include: BLOG_POST_INCLUDE });

        return rows.map((post) => this.summary(post));
      },
      count: () => this.prisma.blogPost.count({ where })
    });
  }

  async article(slug: string): Promise<BlogArticle> {
    const post = await this.prisma.blogPost.findFirst({ where: { slug, status: 'published' }, include: BLOG_POST_INCLUDE });

    if (!post) {
      throw new AppNotFoundException('NOT_FOUND', `No blog post ${slug}`);
    }

    const related = await this.prisma.blogPost.findMany({
      where: {
        status: 'published',
        id: { not: post.id },
        OR: [{ category: post.category }, ...(post.tags.length > 0 ? [{ tags: { hasSome: post.tags } }] : [])]
      },
      orderBy: [...BLOG_POST_ORDER],
      take: BLOG.relatedLimit,
      include: BLOG_POST_INCLUDE
    });

    return { post: toBlogPostView({ post, apiUrl: this.apiUrl() }), related: related.map((row) => this.summary(row)) };
  }

  tags(): Promise<BlogTagCount[]> {
    return this.queries.blogTagCounts({ db: this.prisma.$kysely, limit: BLOG.tagsLimit });
  }

  private summary(post: BlogPostRow): BlogPostSummary {
    return toBlogPostSummary({ post, apiUrl: this.apiUrl() });
  }

  private apiUrl(): string {
    return this.config.get('API_URL');
  }
}
