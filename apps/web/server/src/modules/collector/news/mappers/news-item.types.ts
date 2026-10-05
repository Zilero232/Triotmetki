import type { FeedItem } from '../lib/news-feed/news-feed.types';

export type ToNewsItemsInput = {
  items: readonly FeedItem[];
  now: Date;
};
