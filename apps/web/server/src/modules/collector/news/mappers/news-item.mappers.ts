import type { Prisma } from '../../../../../generated';
import type { ToNewsItemsInput } from './news-item.types';

import { newsKind, publishedAt } from '../lib/news-feed/news-feed';
import { NEWS_FEED } from '../lib/news-feed/news-feed.constants';

export const toNewsItems = ({ items, now }: ToNewsItemsInput): Prisma.NewsItemCreateManyInput[] =>
  items.flatMap((item) => {
    if (!item.link || !item.title) {
      return [];
    }

    return [
      {
        source: NEWS_FEED.source,
        externalId: item.guid ?? null,
        url: item.link,
        kind: newsKind(item),
        title: item.title.trim(),
        summary: item.contentSnippet?.trim().slice(0, NEWS_FEED.summaryLength) || null,
        image: item.enclosure?.url ?? null,
        publishedAt: publishedAt({ item, now })
      }
    ];
  });
