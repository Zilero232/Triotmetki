import { PLAYLIST_REASONS } from '@otmetki/schemas';
import { uniformFloat64 } from 'pure-rand/distribution/uniformFloat64';
import { xoroshiro128plus } from 'pure-rand/generator/xoroshiro128plus';
import { describe, expect, it } from 'vitest';

import type { PlaylistCandidate } from '../playlist.types';

import { PLAYLIST_RULES, PLAYLIST_SEED } from '../../../config/playlist.constants';
import { buildPlaylist, seededRandom } from '../playlist';

const candidate = (tankId: number, overrides: Partial<PlaylistCandidate> = {}): PlaylistCandidate => ({
  tankId,
  tier: 10,
  battles: 100,
  winRate: 50,
  moePercent: null,
  nextMarkPercent: null,
  daysSinceBattle: 1,
  isFirstWinAvailable: false,
  isMission: false,
  ...overrides
});

const CANDIDATES = [
  candidate(1, { moePercent: 84, nextMarkPercent: 85 }),
  candidate(2, { isFirstWinAvailable: true }),
  candidate(3, { daysSinceBattle: PLAYLIST_RULES.longUnplayedDays }),
  candidate(4, { winRate: PLAYLIST_RULES.lowWinRate - 1 }),
  candidate(5, { isMission: true }),
  candidate(6),
  candidate(7, { tier: PLAYLIST_RULES.minTier - 1, isFirstWinAvailable: true })
];

describe('seededRandom', () => {
  it('repeats the sequence for the same seed and stays in [0, 1)', () => {
    const first = seededRandom(42);
    const second = seededRandom(42);
    const values = Array.from({ length: 20 }, () => first());

    expect(values).toEqual(Array.from({ length: 20 }, () => second()));
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true);
  });

  it('keeps the sequence of a day before the pure-rand switch', () => {
    const random = seededRandom(20_000);

    expect([random(), random(), random()]).toEqual([0.548_125_733_388_587_8, 0.887_897_496_344_521_6, 0.872_610_077_261_924_7]);
  });

  it('draws from xoroshiro128plus from the switch day on', () => {
    const random = seededRandom(PLAYLIST_SEED.pureRandFromDay);
    const generator = xoroshiro128plus(PLAYLIST_SEED.pureRandFromDay);

    expect([random(), random()]).toEqual([uniformFloat64(generator), uniformFloat64(generator)]);
  });
});

describe('buildPlaylist', () => {
  it('only suggests tanks with a reason and skips low tiers', () => {
    const picks = buildPlaylist({ candidates: CANDIDATES, size: 10, reasons: PLAYLIST_REASONS, seed: 1 });
    const ids = picks.map((pick) => pick.candidate.tankId);

    expect(ids).not.toContain(6);
    expect(ids).not.toContain(7);
    expect(picks.every((pick) => pick.reasons.length > 0)).toBe(true);
  });

  it('uses only the allowed reasons', () => {
    const picks = buildPlaylist({ candidates: CANDIDATES, size: 10, reasons: ['firstWin'], seed: 1 });

    expect(picks.map((pick) => pick.candidate.tankId)).toEqual([2]);
  });

  it('respects the size and is stable for a seed', () => {
    const input = { candidates: CANDIDATES, size: 2, reasons: PLAYLIST_REASONS, seed: 7 };

    expect(buildPlaylist(input)).toHaveLength(2);
    expect(buildPlaylist(input)).toEqual(buildPlaylist(input));
  });
});
