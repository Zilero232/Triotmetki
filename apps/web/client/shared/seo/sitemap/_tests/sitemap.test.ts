import { describe, expect, it } from 'vitest';

import { SITE } from '@/shared/config';

import { sitemapContentEntries, sitemapEntries, sitemapUrls } from '../sitemap';

describe('sitemapEntries', () => {
  it('lists every locale version with locale and x-default alternates and drops duplicates', () => {
    const languages = {
      ru: new URL('/tanks', SITE.url).toString(),
      en: new URL('/en/tanks', SITE.url).toString(),
      'x-default': new URL('/tanks', SITE.url).toString()
    };

    expect(sitemapEntries(['/tanks', '/tanks'])).toEqual([
      { url: languages.ru, alternates: { languages } },
      { url: languages.en, alternates: { languages } }
    ]);
  });
});

describe('sitemapContentEntries', () => {
  it('lists one locale version with its own x-default and the last modification date', () => {
    const url = new URL('/en/blog/patch', SITE.url).toString();

    expect(sitemapContentEntries([{ path: '/blog/patch', locale: 'en', lastModified: '2026-10-01T00:00:00.000Z' }])).toEqual([
      { url, alternates: { languages: { en: url, 'x-default': url } }, lastModified: '2026-10-01T00:00:00.000Z' }
    ]);
  });
});

describe('sitemapUrls', () => {
  it('names one sitemap per section', () => {
    expect(sitemapUrls()).toContain(new URL('/sitemap/tanks.xml', SITE.url).toString());
  });
});
