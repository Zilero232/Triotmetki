import type { StatsBlock } from '@otmetki/schemas';
import type { ReactNode } from 'react';

import { renderHook } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { FORMATS, messages } from '@/shared/i18n';

import type { StatsTile, UseStatsTilesInput } from '..';

import { useStatsTiles } from '..';
import { ratingValueTone, winRateTone } from '../../../../lib/stats-view';

const STATS: StatsBlock = {
  battles: 12_000,
  winRate: 54.25,
  avgDamage: 2100,
  avgFrags: 1.1,
  avgSpotted: 1.3,
  avgXp: 700,
  avgBlocked: 500,
  avgAssisted: 800,
  survivalRate: 38.5,
  accuracy: 80.1,
  avgTier: 8.4,
  wn8: { value: 2400, tier: 'great' },
  eff: { value: 1600, tier: 'good' },
  broneIndex: { value: null, tier: null }
};

const REFERENCE: StatsBlock = { ...STATS, winRate: 52.75, avgDamage: 2300, wn8: { value: 2400, tier: 'great' } };

const wrapper = ({ children }: { children: ReactNode }) => (
  <NextIntlClientProvider formats={FORMATS} locale='en' messages={messages.en} timeZone='UTC'>
    {children}
  </NextIntlClientProvider>
);

const tiles = (input: UseStatsTilesInput) => renderHook(() => useStatsTiles(input), { wrapper }).result.current;

const tile = (list: StatsTile[], key: string) => {
  const found = list.find((candidate) => candidate.key === key);

  if (!found) {
    throw new Error(`missing tile ${key}`);
  }

  return found;
};

describe('useStatsTiles', () => {
  it('lists every headline stat once with its value', () => {
    const list = tiles({ stats: STATS });

    expect(new Set(list.map(({ key }) => key)).size).toBe(list.length);
    expect(tile(list, 'battles').value).toBe(STATS.battles);
    expect(tile(list, 'wn8').value).toBe(STATS.wn8.value);
    expect(tile(list, 'survival').value).toBe(STATS.survivalRate);
  });

  it('shows averages and ratings as whole numbers', () => {
    const list = tiles({ stats: { ...STATS, avgDamage: 5508.475, wn8: { value: 6528.276, tier: 'super_unicum' } } });

    expect(tile(list, 'avgDamage').format).toEqual({ maximumFractionDigits: 0 });
    expect(tile(list, 'wn8').format).toEqual({ maximumFractionDigits: 0 });
    expect(tile(list, 'eff').format).toEqual({ maximumFractionDigits: 0 });
  });

  it('shows no change without a reference period', () => {
    const list = tiles({ stats: STATS });

    expect(list.every(({ delta, deltaLabel }) => delta === undefined && deltaLabel === undefined)).toBe(true);
  });

  it('compares the tracked stats against the reference period', () => {
    const list = tiles({ stats: STATS, reference: REFERENCE });

    expect(tile(list, 'winRate').delta).toBeCloseTo((STATS.winRate ?? 0) - (REFERENCE.winRate ?? 0));
    expect(tile(list, 'avgDamage').delta).toBe((STATS.avgDamage ?? 0) - (REFERENCE.avgDamage ?? 0));
    expect(tile(list, 'wn8').delta).toBe(0);
    expect(tile(list, 'battles').delta).toBeUndefined();
  });

  it('signs the change label and keeps win-rate precision', () => {
    const list = tiles({ stats: STATS, reference: REFERENCE });

    expect(tile(list, 'winRate').deltaLabel).toBe('+1.50');
    expect(tile(list, 'avgDamage').deltaLabel).toMatch(/^[-−]200$/);
    expect(tile(list, 'wn8').deltaLabel).toBe('0');
  });

  it('skips the change when either side of the comparison is unknown', () => {
    const list = tiles({ stats: STATS, reference: { ...REFERENCE, winRate: null } });

    expect(tile(list, 'winRate').delta).toBeUndefined();
    expect(tile(list, 'winRate').deltaLabel).toBeUndefined();
  });

  it('passes trend series through to their tiles', () => {
    const trend = [1, 2, 3];
    const list = tiles({ stats: STATS, trends: { wn8: trend } });

    expect(tile(list, 'wn8').trend).toEqual(trend);
    expect(tile(list, 'winRate').trend).toBeUndefined();
  });

  it('colours win rate and ratings by their own scales', () => {
    const list = tiles({ stats: STATS });

    expect(tile(list, 'winRate').tone).toBe(winRateTone(STATS.winRate));
    expect(tile(list, 'wn8').tone).toBe(ratingValueTone(STATS.wn8));
    expect(tile(list, 'eff').tone).toBe(ratingValueTone(STATS.eff));
  });
});
