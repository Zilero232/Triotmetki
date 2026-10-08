import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/i18n';
import { toneOfTier } from '@/shared/lib';
import { OG_COLORS, OG_TONES } from '@/shared/seo/og';

import { clanOgCard, guideOgCard, mapOgCard, siteOgCard, tankOgCard } from '../entity-og-card';

const vehicle = {
  tankId: 1,
  name: 'Объект 140',
  shortName: 'Об. 140',
  slug: 'object-140',
  nation: 'ussr',
  type: 'mediumTank',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null }
} as const;

describe('tankOgCard', () => {
  it('describes a tank with dashes for missing stats', () => {
    const card = tankOgCard({ tank: { vehicle, serverStats: [] }, kind: 'build', locale: 'ru', host: 'example.ru' });

    expect(card.title).toBe('Объект 140');
    expect(card.url).toBe('example.ru/builds/object-140');
    expect(card.subtitle).toContain('X');
    expect(card.metrics.map(({ value }) => value)).toEqual(['—', '—', '—']);
  });

  it('links a tank card to the tank page and paints an unknown win rate as average', () => {
    const card = tankOgCard({ tank: { vehicle, serverStats: [] }, kind: 'tank', locale: 'en', host: 'example.ru' });

    expect(card.url).toBe('example.ru/t/object-140');
    expect(card.heading).toBe(`${messages.en.brand.name} · ${messages.en.og.kinds.tank}`);
    expect(card.metrics[0]?.color).toBe(OG_TONES.average);
    expect(card.metrics[1]?.color).toBe(OG_COLORS.text);
  });
});

describe('tankOgCard for the armor page', () => {
  it('links the armor card to the armor page', () => {
    const card = tankOgCard({ tank: { vehicle, serverStats: [] }, kind: 'armor', locale: 'en', host: 'example.ru' });

    expect(card.url).toBe('example.ru/t/object-140/armor');
  });

  it('labels the armor card as armour', () => {
    const card = tankOgCard({ tank: { vehicle, serverStats: [] }, kind: 'armor', locale: 'ru', host: 'example.ru' });

    expect(card.heading).toBe(`${messages.ru.brand.name} · БРОНЯ`);
  });
});

describe('mapOgCard', () => {
  const map = { slug: 'himmelsdorf', name: 'Химмельсдорф', nameEn: 'Himmelsdorf', sizeMeters: 700, maxPlayersInTeam: 15, stats: null };

  it('names the map in the reader language', () => {
    expect(mapOgCard({ map, locale: 'en', host: 'example.ru' }).title).toBe('Himmelsdorf');
  });

  it('falls back to the Russian name before the English one is synced', () => {
    expect(mapOgCard({ map: { ...map, nameEn: null }, locale: 'en', host: 'example.ru' }).title).toBe('Химмельсдорф');
  });

  it('links the map page', () => {
    expect(mapOgCard({ map, locale: 'ru', host: 'example.ru' }).url).toBe('example.ru/maps/himmelsdorf');
  });

  it('shows the team size and a dash for battles it has no stats for', () => {
    const card = mapOgCard({ map, locale: 'en', host: 'example.ru' });

    expect(card.metrics.map(({ value }) => value)).toEqual(['15', '—']);
  });
});

describe('guideOgCard', () => {
  const guide = { slug: 'is-7', title: 'ИС-7 за 5 минут', kind: 'tank', likesCount: 1200, author: { id: 'a1', name: 'Автор', image: null } } as const;

  it('titles the card with the guide and labels it as a guide', () => {
    const card = guideOgCard({ guide, locale: 'ru', host: 'example.ru' });

    expect(card.heading).toBe(`${messages.ru.brand.name} · ГАЙД`);
  });

  it('names the kind and the author under the title', () => {
    const card = guideOgCard({ guide, locale: 'en', host: 'example.ru' });

    expect(card.subtitle).toBe(`${messages.en.guides.kinds.tank} · Автор`);
  });

  it('links the guide page', () => {
    expect(guideOgCard({ guide, locale: 'en', host: 'example.ru' }).url).toBe('example.ru/guides/is-7');
  });

  it('counts the guide likes', () => {
    const card = guideOgCard({ guide, locale: 'en', host: 'example.ru' });

    expect(card.metrics[0]?.value).toBe('1,200');
  });
});

describe('clanOgCard', () => {
  it('shows the tag, name and member count', () => {
    const page = {
      clan: {
        clanId: 1,
        tag: 'KOPTE',
        name: 'Кортеж',
        color: null,
        motto: null,
        emblem: null,
        membersCount: 100,
        createdAt: null,
        isDisbanded: false
      },
      stats: {
        avgWinRate: null,
        avgWn8: { value: null, tier: null },
        avgBattlesPerDay: null,
        activeMembers7d: null,
        eloRating10: null,
        strongholdLevel: null,
        provincesCount: 0
      }
    };

    const card = clanOgCard({ page, locale: 'en', host: 'example.ru' });

    expect(card.title).toBe('[KOPTE]');
    expect(card.subtitle).toBe('Кортеж');
    expect(card.url).toBe('example.ru/c/KOPTE');
    expect(card.metrics.at(-1)?.value).toBe('100');
  });
});

describe('clanOgCard with stats', () => {
  it('formats the clan ratings and colours WN8 by its tier', () => {
    const card = clanOgCard({
      page: {
        clan: { clanId: 1, tag: 'RED', name: 'Red', color: null, motto: null, emblem: null, membersCount: 1234, createdAt: null, isDisbanded: false },
        stats: {
          avgWinRate: 55.5,
          avgWn8: { value: 2100, tier: 'great' },
          avgBattlesPerDay: null,
          activeMembers7d: null,
          eloRating10: null,
          strongholdLevel: null,
          provincesCount: 0
        }
      },
      locale: 'en',
      host: 'example.ru'
    });

    expect(card.metrics.map(({ key, value }) => [key, value])).toEqual([
      ['wn8', '2,100'],
      ['winRate', '55.5%'],
      ['members', '1,234']
    ]);

    expect(card.metrics[0]?.color).toBe(OG_TONES[toneOfTier('great')]);
  });
});

describe('siteOgCard', () => {
  it('shows the brand and tagline without metrics and links the host', () => {
    expect(siteOgCard({ locale: 'en', host: 'https://triotmetki.ru' })).toEqual({
      heading: `${messages.en.brand.name} · ${messages.en.og.kinds.site}`,
      title: messages.en.brand.name,
      subtitle: messages.en.brand.tagline,
      metrics: [],
      url: 'https://triotmetki.ru',
      source: messages.en.footer.shortAttribution
    });
  });
});
