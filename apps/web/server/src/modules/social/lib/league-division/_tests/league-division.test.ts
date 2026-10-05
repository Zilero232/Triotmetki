import { LEAGUE_TIERS } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import { LEAGUE_DIVISION } from '../../../config/leagues.constants';
import { divisionStandings, divisionZones, nextTier, placeMembers, tierMoves } from '../league-division';

const [lowest, second] = LEAGUE_TIERS;
const top = LEAGUE_TIERS.at(-1) ?? lowest;
const middle = LEAGUE_TIERS[Math.floor(LEAGUE_TIERS.length / 2)] ?? lowest;

const entries = (values: readonly (number | null)[]) => values.map((value, index) => ({ accountId: BigInt(index + 1), value }));

const zonesOf = (result: ReturnType<typeof divisionZones>) => [...result.zones.values()];

describe('nextTier', () => {
  it('starts a newcomer in the lowest tier', () => {
    expect(nextTier({ tier: null, zone: null })).toBe(lowest);
  });

  it('moves one tier up after promotion and one down after relegation', () => {
    const index = LEAGUE_TIERS.indexOf(middle);

    expect(nextTier({ tier: middle, zone: 'promotion' })).toBe(LEAGUE_TIERS[index + 1]);
    expect(nextTier({ tier: middle, zone: 'relegation' })).toBe(LEAGUE_TIERS[index - 1]);
    expect(nextTier({ tier: middle, zone: 'stay' })).toBe(middle);
  });

  it('keeps an unclosed week in the same tier', () => {
    expect(nextTier({ tier: second ?? lowest, zone: null })).toBe(second);
  });

  it('never leaves the ladder', () => {
    expect(nextTier({ tier: top, zone: 'promotion' })).toBe(top);
    expect(nextTier({ tier: lowest, zone: 'relegation' })).toBe(lowest);
  });
});

describe('divisionZones', () => {
  const rules = { minRanked: LEAGUE_DIVISION.minRanked, zoneShare: LEAGUE_DIVISION.zoneShare };
  const ranked = LEAGUE_DIVISION.groupSize;
  const slots = Math.floor(ranked * rules.zoneShare);
  const full = entries(Array.from({ length: ranked }, (_, index) => ranked - index));

  it('promotes the top share and relegates the bottom share of a middle tier', () => {
    const result = divisionZones({ tier: middle, entries: full, rules });
    const zones = zonesOf(result);

    expect(result).toMatchObject({ promotionSlots: slots, relegationSlots: slots });
    expect(zones.slice(0, slots).every((zone) => zone === 'promotion')).toBe(true);
    expect(zones.slice(-slots).every((zone) => zone === 'relegation')).toBe(true);
    expect(zones.filter((zone) => zone === 'stay')).toHaveLength(ranked - slots * 2);
  });

  it('promotes nobody from the top tier and relegates nobody from the lowest', () => {
    expect(divisionZones({ tier: top, entries: full, rules }).promotionSlots).toBe(0);
    expect(zonesOf(divisionZones({ tier: lowest, entries: full, rules })).includes('relegation')).toBe(false);
  });

  it('draws no zones for a group with too few ranked players', () => {
    const small = entries(Array.from({ length: rules.minRanked - 1 }, (_, index) => index + 1));

    expect(zonesOf(divisionZones({ tier: middle, entries: small, rules })).every((zone) => zone === 'stay')).toBe(true);
  });

  it('gives a zone of one to the smallest group that has zones', () => {
    const small = entries(Array.from({ length: rules.minRanked }, (_, index) => rules.minRanked - index));

    expect(divisionZones({ tier: middle, entries: small, rules })).toMatchObject({ promotionSlots: 1, relegationSlots: 1 });
  });

  it('relegates inactive players above the lowest tier and keeps them in the lowest', () => {
    const withInactive = [...full, { accountId: 999n, value: null }];

    expect(divisionZones({ tier: middle, entries: withInactive, rules }).zones.get(999n)).toBe('relegation');
    expect(divisionZones({ tier: lowest, entries: withInactive, rules }).zones.get(999n)).toBe('stay');
  });
});

describe('placeMembers', () => {
  const size = LEAGUE_DIVISION.groupSize;
  const ids = (count: number) => Array.from({ length: count }, (_, index) => BigInt(index + 1));

  it('splits a fresh tier into even groups no larger than the group size', () => {
    const placed = placeMembers({ groups: new Map(), newcomers: ids(size * 2 + 1), groupSize: size });
    const counts = [...placed.values()].reduce((map, groupNo) => map.set(groupNo, (map.get(groupNo) ?? 0) + 1), new Map<number, number>());

    expect(counts.size).toBe(3);
    expect(Math.max(...counts.values()) - Math.min(...counts.values())).toBeLessThanOrEqual(1);
    expect(Math.max(...counts.values())).toBeLessThanOrEqual(size);
  });

  it('deals players round-robin so neighbours in the order land in different groups', () => {
    const placed = placeMembers({ groups: new Map(), newcomers: ids(size + 1), groupSize: size });

    expect(placed.get(1n)).not.toBe(placed.get(2n));
  });

  it('puts one group together when the tier is small', () => {
    expect(new Set(placeMembers({ groups: new Map(), newcomers: ids(3), groupSize: size }).values())).toEqual(new Set([1]));
  });

  it('adds a late joiner to the emptiest open group', () => {
    const placed = placeMembers({
      groups: new Map([
        [1, size - 1],
        [2, size - 5]
      ]),
      newcomers: [100n],
      groupSize: size
    });

    expect(placed.get(100n)).toBe(2);
  });

  it('opens a new group when every group is full', () => {
    const placed = placeMembers({
      groups: new Map([
        [1, size],
        [2, size]
      ]),
      newcomers: [100n, 101n],
      groupSize: size
    });

    expect([placed.get(100n), placed.get(101n)]).toEqual([3, 3]);
  });
});

describe('divisionStandings', () => {
  const stat = (accountId: bigint, battles: number, wn8: number | null) => ({
    accountId,
    battles,
    damage: 0,
    wn8Weighted: (wn8 ?? 0) * battles,
    wn8Battles: wn8 === null ? 0 : battles,
    marks: 0
  });

  it('ranks the group and carries each player’s zone', () => {
    const battles = LEAGUE_DIVISION.minBattles;
    const stats = Array.from({ length: LEAGUE_DIVISION.minRanked }, (_, index) => stat(BigInt(index + 1), battles, 1_000 + index));
    const { entries } = divisionStandings({
      tier: middle,
      stats: [...stats, stat(99n, battles - 1, 5_000)],
      metric: LEAGUE_DIVISION.metric,
      minBattles: battles,
      rules: LEAGUE_DIVISION
    });

    expect(entries[0]).toMatchObject({ accountId: BigInt(LEAGUE_DIVISION.minRanked), rank: 1, zone: 'promotion' });
    expect(entries.find((entry) => entry.accountId === 99n)).toMatchObject({ value: null, zone: 'relegation' });
  });
});

describe('tierMoves', () => {
  it('names the tiers a group moves to and nothing past the ends of the ladder', () => {
    expect(tierMoves(lowest)).toEqual({ promotesTo: second, relegatesTo: null });
    expect(tierMoves(top)).toMatchObject({ promotesTo: null });
  });
});
