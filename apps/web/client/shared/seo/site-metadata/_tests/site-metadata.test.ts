import { describe, expect, it } from 'vitest';

import { SITE } from '@/shared/config';
import { ROUTES } from '@/shared/constants';
import { DEFAULT_LOCALE, localePath, LOCALES } from '@/shared/i18n';

import { createPageMetadata } from '../page-metadata';
import { absoluteUrl, languageAlternates } from '../site-metadata';
import { SITE_METADATA } from '../site-metadata.constants';

describe('languageAlternates', () => {
  it('lists every locale plus x-default pointing at the default locale', () => {
    const alternates = languageAlternates('/tanks');

    expect(Object.keys(alternates).sort()).toEqual([...LOCALES, SITE_METADATA.xDefault].sort());
    expect(alternates[SITE_METADATA.xDefault]).toBe(alternates[DEFAULT_LOCALE]);
  });

  it('localises the path for every locale', () => {
    const alternates = languageAlternates('/tanks');

    LOCALES.forEach((locale) => expect(alternates[locale]).toBe(localePath({ path: '/tanks', locale })));
  });
});

describe('absoluteUrl', () => {
  it('resolves a path against the site origin', () => {
    expect(absoluteUrl('/tanks')).toBe(new URL('/tanks', SITE.url).toString());
  });

  it('writes the site root without a trailing slash, the way page metadata spells the canonical', () => {
    expect(absoluteUrl('/')).toBe(SITE.url);
  });
});

describe('createPageMetadata', () => {
  it('appends the site name to the title once', () => {
    const plain = createPageMetadata({ title: 'Танки', description: '', locale: DEFAULT_LOCALE });
    const branded = createPageMetadata({ title: `${SITE.name} — главная`, description: '', locale: DEFAULT_LOCALE });

    expect(plain.title).toEqual({ absolute: `Танки · ${SITE.name}` });
    expect(branded.title).toEqual({ absolute: `${SITE.name} — главная` });
  });

  it('brands English pages with the English site name', () => {
    const plain = createPageMetadata({ title: 'Tanks', description: '', locale: 'en' });

    expect(plain.title).toEqual({ absolute: `Tanks · ${SITE.en.title}` });
    expect(plain.applicationName).toBe(SITE.en.title);
    expect(plain.openGraph).toMatchObject({ siteName: SITE.en.title, locale: SITE.en.locale, alternateLocale: [SITE.locale] });
  });

  it('keeps pages out of the index unless asked', () => {
    const hidden = createPageMetadata({ title: 'x', description: '', path: '/x', locale: DEFAULT_LOCALE });
    const indexed = createPageMetadata({ title: 'x', description: '', path: '/x', locale: DEFAULT_LOCALE, index: true });

    expect(hidden.robots).toEqual({ index: false, follow: false });
    expect(hidden.alternates).toBeNull();
    expect(indexed.alternates?.languages).toEqual(languageAlternates('/x'));
  });

  it('keeps the site-wide Open Graph and Twitter fields', () => {
    const metadata = createPageMetadata({ title: 'x', description: '', locale: DEFAULT_LOCALE });

    expect(metadata.openGraph).toMatchObject({ siteName: SITE.name });
    expect(metadata.twitter).toMatchObject({ card: 'summary_large_image' });
  });

  it('falls back to the site card unless the page draws its own image', () => {
    const plain = createPageMetadata({ title: 'x', description: '', locale: DEFAULT_LOCALE });
    const own = createPageMetadata({ title: 'x', description: '', locale: DEFAULT_LOCALE, hasOwnImage: true });

    expect(plain.openGraph?.images).toEqual([expect.objectContaining({ url: ROUTES.api.siteCard(DEFAULT_LOCALE) })]);
    expect(own.openGraph).not.toHaveProperty('images');
    expect(plain.twitter).toMatchObject({ images: plain.openGraph?.images });
  });
});
