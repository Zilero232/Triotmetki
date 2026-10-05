import { Injectable } from '@nestjs/common';
import { Feed } from 'feed';

import { AppConfigService } from '../../../config';
import { PrismaService } from '../../../core';
import { BLOG } from '../config/blog.constants';
import { BLOG_FEED } from '../config/feed.constants';
import { blogFeedLink } from '../lib/feed-link/feed-link';
import { blogCoverUrl } from '../lib/image-url/image-url';
import { BLOG_POST_INCLUDE, BLOG_POST_ORDER } from '../selects/blog-post.selects';

@Injectable()
export class BlogRssReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService
  ) {}

  async rss(): Promise<string> {
    const webUrl = this.config.get('WEB_URL');
    const apiUrl = this.config.get('API_URL');
    const home = blogFeedLink({ webUrl, locale: BLOG.defaultLocale });
    const posts = await this.prisma.blogPost.findMany({
      where: { status: 'published' },
      orderBy: [...BLOG_POST_ORDER],
      take: BLOG_FEED.limit,
      include: BLOG_POST_INCLUDE
    });

    const feed = new Feed({
      id: home,
      link: home,
      title: BLOG_FEED.title,
      description: BLOG_FEED.description,
      language: BLOG.defaultLocale,
      generator: false,
      updated: posts[0]?.publishedAt ?? undefined,
      feedLinks: { rss: new URL(BLOG_FEED.feedPath, apiUrl).href }
    });

    posts.forEach((post) => {
      const link = blogFeedLink({ webUrl, locale: post.locale, slug: post.slug });
      const image = blogCoverUrl({ post, apiUrl });

      feed.addItem({
        id: link,
        link,
        title: post.title,
        description: post.excerpt,
        date: post.publishedAt ?? post.createdAt,
        category: [{ name: post.category }, ...post.tags.map((name) => ({ name }))],
        ...(post.author ? { author: [{ name: post.author.name }] } : {}),
        ...(image ? { image } : {})
      });
    });

    return feed.rss2();
  }
}
