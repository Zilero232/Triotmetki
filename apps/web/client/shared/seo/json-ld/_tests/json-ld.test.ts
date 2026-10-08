import { describe, expect, it } from 'vitest';

import { SITE, SUPPORT } from '@/shared/config/site';

import { articleJsonLd, breadcrumbJsonLd, clanJsonLd, itemListJsonLd, jsonLdText, organizationJsonLd, personJsonLd, siteJsonLd } from '../json-ld';

describe('jsonLdText', () => {
  it('escapes a closing script tag', () => {
    expect(jsonLdText({ '@context': 'https://schema.org', '@type': 'Thing', name: '</script>' })).not.toContain('</script>');
  });

  it('escapes every opening bracket and still parses back to the same data', () => {
    const data = { '@context': 'https://schema.org', '@type': 'Thing', name: '<b>a</b> < c' } as const;
    const text = jsonLdText(data);

    expect(text).not.toContain('<');
    expect(JSON.parse(text)).toEqual(data);
  });
});

describe('organizationJsonLd', () => {
  it('points the logo at an absolute url on the site', () => {
    expect(organizationJsonLd().logo).toBe(new URL('/icon.svg', SITE.url).toString());
  });

  it('links the project Telegram as the same organization', () => {
    expect(organizationJsonLd().sameAs).toEqual([SUPPORT.telegramUrl]);
  });
});

describe('personJsonLd', () => {
  it('describes a player profile page with its locale url and avatar', () => {
    expect(personJsonLd({ name: 'Tanker', path: '/p/Tanker', locale: 'en', image: 'https://cdn.test/a.png' })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'ProfilePage',
      url: `${SITE.url}/en/p/Tanker`,
      mainEntity: { '@type': 'Person', name: 'Tanker', url: `${SITE.url}/en/p/Tanker`, image: 'https://cdn.test/a.png' }
    });
  });

  it('leaves the image out when the player has none', () => {
    expect(personJsonLd({ name: 'Tanker', path: '/p/Tanker', locale: 'ru', image: null }).mainEntity).toEqual({
      '@type': 'Person',
      name: 'Tanker',
      url: `${SITE.url}/p/Tanker`
    });
  });
});

describe('clanJsonLd', () => {
  it('uses the clan emblem as the team logo', () => {
    expect(clanJsonLd({ name: 'RED', path: '/c/RED', locale: 'ru', image: 'https://cdn.test/red.png' })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'SportsTeam',
      name: 'RED',
      url: `${SITE.url}/c/RED`,
      logo: 'https://cdn.test/red.png'
    });
  });

  it('omits the logo for a clan without an emblem', () => {
    expect(clanJsonLd({ name: 'RED', path: '/c/RED', locale: 'en' })).not.toHaveProperty('logo');
  });
});

describe('breadcrumbJsonLd', () => {
  it('numbers the crumbs and links only those with a path', () => {
    const list = breadcrumbJsonLd({ items: [{ name: 'Танки', path: '/tanks' }, { name: 'ИС-7' }], locale: 'en' });

    expect(list.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Танки', item: `${SITE.url}/en/tanks` },
      { '@type': 'ListItem', position: 2, name: 'ИС-7' }
    ]);
  });
});

describe('siteJsonLd', () => {
  it('describes the localized site without the retired sitelinks search box', () => {
    const text = jsonLdText(siteJsonLd('en'));

    expect(text).toContain(`"url":"${SITE.url}/en"`);
    expect(text).not.toContain('SearchAction');
  });
});

describe('itemListJsonLd', () => {
  it('numbers the items from one and links each to its absolute locale URL', () => {
    const data = itemListJsonLd({ name: 'Scouts', path: '/t/collections/scouts', items: [{ name: 'T-100 LT', path: '/t/t-100-lt' }], locale: 'en' });

    expect(data).toMatchObject({
      numberOfItems: 1,
      itemListElement: [{ position: 1, name: 'T-100 LT', url: `${SITE.url}/en/t/t-100-lt` }]
    });
  });

  it('describes an empty collection as a list of zero items', () => {
    expect(itemListJsonLd({ name: 'Empty', path: '/t/collections/x', items: [], locale: 'ru' })).toMatchObject({
      numberOfItems: 0,
      itemListElement: []
    });
  });
});

describe('articleJsonLd', () => {
  const ARTICLE = {
    headline: 'Разбор патча',
    description: 'Что поменялось',
    path: '/blog/patch',
    locale: 'en',
    dateModified: '2026-09-21T10:00:00.000Z'
  } as const;

  it('describes a blog post at its locale url published by the site', () => {
    const data = articleJsonLd({ ...ARTICLE, datePublished: '2026-09-20T10:00:00.000Z', image: 'https://cdn.test/c.png', authorName: 'Editor' });

    expect(data).toMatchObject({
      '@type': 'BlogPosting',
      url: `${SITE.url}/en/blog/patch`,
      image: ['https://cdn.test/c.png'],
      author: { '@type': 'Person', name: 'Editor' },
      publisher: organizationJsonLd()
    });
  });

  it('credits the organisation and leaves optional fields out when they are unknown', () => {
    const data = articleJsonLd(ARTICLE);

    expect(data.author).toEqual({ '@id': `${SITE.url}/#organization` });
    expect(data).not.toHaveProperty('image');
    expect(data).not.toHaveProperty('datePublished');
  });
});
