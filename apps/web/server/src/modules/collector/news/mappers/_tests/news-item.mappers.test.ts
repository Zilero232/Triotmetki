import { describe, expect, it } from 'vitest';

import { NEWS_FEED } from '../../lib/news-feed/news-feed.constants';
import { toNewsItems } from '../news-item.mappers';

const now = new Date('2026-09-24T12:00:00Z');

describe('toNewsItems', () => {
  it('drops items without a link or a title', () => {
    expect(toNewsItems({ items: [{ title: 'x' }, { link: 'https://tanki.su/a' }], now })).toEqual([]);
  });

  it('falls back to the observation time for an unparsable date', () => {
    const [item] = toNewsItems({ items: [{ title: 'x', link: 'https://tanki.su/a', pubDate: 'garbage' }], now });

    expect(item?.publishedAt).toEqual(now);
  });

  it('caps the summary length', () => {
    const [item] = toNewsItems({
      items: [{ title: 'x', link: 'https://tanki.su/a', contentSnippet: 'a'.repeat(NEWS_FEED.summaryLength * 2) }],
      now
    });

    expect(item?.summary).toHaveLength(NEWS_FEED.summaryLength);
  });
});
