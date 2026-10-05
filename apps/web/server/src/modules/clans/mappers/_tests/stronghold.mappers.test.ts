import { describe, expect, it } from 'vitest';

import type { ToStrongholdInput } from '../stronghold.types';

import { STRONGHOLD } from '../../config/stronghold.constants';
import { toStronghold } from '../stronghold.mappers';

const [lowTier = 0, midTier = 0] = STRONGHOLD.tiers;

const building = { building_type: 'artillery', building_title: 'Artillery', level: 3.6, arena_id: 42 };

const input: ToStrongholdInput = {
  clanId: 7,
  level: 5,
  stats: null,
  buildings: null,
  reserves: null,
  updatedAt: null,
  elo: { eloRating6: null, eloRating8: 1_200, eloRating10: null },
  provinces: []
};

describe('toStronghold', () => {
  it('reads buildings stored as a list', () => {
    const [first] = toStronghold({ ...input, buildings: [building] }).buildings;

    expect(first).toEqual({
      type: building.building_type,
      title: building.building_title,
      level: Math.round(building.level),
      position: null,
      direction: null,
      arenaId: String(building.arena_id),
      reserve: null
    });
  });

  it('reads buildings stored as a record keyed by slot', () => {
    expect(toStronghold({ ...input, buildings: { a: building, b: { type: 'barracks' } } }).buildings.map((item) => item.type)).toEqual([
      building.building_type,
      'barracks'
    ]);
  });

  it('falls back to the buildings inside the stats when none are stored', () => {
    const stronghold = toStronghold({ ...input, stats: { buildings: [building] } });

    expect(stronghold.buildings.map((item) => item.type)).toEqual([building.building_type]);
  });

  it('flattens every reserve in stock into its own entry', () => {
    const activatedAt = 1_750_000_000;
    const reserves = toStronghold({
      ...input,
      reserves: [
        { type: 'battle_payments', title: 'Payments', in_stock: [{ level: 1, amount: 2, activated_at: activatedAt }, { level: 2 }] },
        { type: 'empty', in_stock: null }
      ]
    }).reserves;

    expect(reserves).toHaveLength(2);

    expect(reserves[0]).toMatchObject({
      type: 'battle_payments',
      level: 1,
      count: 2,
      activatedAt: new Date(activatedAt * 1_000).toISOString(),
      expiresAt: null
    });

    expect(reserves[1]?.count).toBeNull();
  });

  it('lists only tiers with battles and derives the win rate as a percent', () => {
    const stronghold = toStronghold({
      ...input,
      stats: { skirmish_statistics: { [STRONGHOLD.totalKey(lowTier)]: 4, [STRONGHOLD.winKey(lowTier)]: 3, [STRONGHOLD.totalKey(midTier)]: 0 } }
    });

    expect(stronghold.skirmishes).toEqual([{ tier: lowTier, battles: 4, wins: 3, winRate: (3 * 100) / 4 }]);
    expect(stronghold.battles).toBe(4);
    expect(stronghold.winRate).toBe((3 * 100) / 4);
  });

  it('never counts more wins than battles', () => {
    const [tier] = toStronghold({
      ...input,
      stats: { skirmish_statistics: { [STRONGHOLD.totalKey(lowTier)]: 2, [STRONGHOLD.winKey(lowTier)]: 5 } }
    }).skirmishes;

    expect(tier?.wins).toBe(tier?.battles);
  });

  it('treats unparseable stats as an empty stronghold', () => {
    const stronghold = toStronghold({ ...input, stats: 'garbage', reserves: 'garbage' });

    expect(stronghold).toMatchObject({
      commandCenterArenaId: null,
      totalResources: null,
      buildingSlots: null,
      buildings: [],
      reserves: [],
      skirmishes: [],
      battles: 0,
      winRate: null
    });
  });

  it('counts the global map provinces and carries the elo ratings', () => {
    const provinces = [{ provinceId: 'p1', name: 'One', arenaId: null, dailyRevenue: null }];

    expect(toStronghold({ ...input, provinces }).globalMap).toEqual({ provincesCount: provinces.length, ...input.elo, provinces });
  });
});
