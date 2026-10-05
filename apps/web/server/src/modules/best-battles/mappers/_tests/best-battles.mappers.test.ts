import type { VehicleSummary } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';

import type { RankedBattleRow } from '../../lib/feed-merge/feed-merge.types';

import { toBestBattle } from '../best-battles.mappers';

const vehicle: VehicleSummary = {
  tankId: 1,
  name: 'Tank',
  shortName: 'Tank',
  slug: 'tank',
  nation: 'ussr',
  type: 'heavyTank',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null }
};

const row: RankedBattleRow = {
  key: '1:5',
  rank: 1,
  source: 'replay',
  battle_id: 'replay-1',
  account_id: 42,
  arena_unique_id: 5,
  nickname: null,
  tank_id: 1,
  arena_id: 'karelia',
  map_name: 'Karelia',
  result: 'win',
  damage: 4321.6,
  assisted: null,
  spotted: null,
  frags: 3,
  xp: 1500,
  blocked: null,
  medals: ['warrior', 'unknownMedal'],
  played_at: new Date('2026-09-20T12:00:00.000Z'),
  replay_id: 'replay-1'
};

const lookups = {
  vehicles: new Map([[1, vehicle]]),
  arenas: new Map<string, string>(),
  medals: new Map([['warrior', { name: 'warrior', title: 'Top Gun', image: 'https://api.tanki.su/static/warrior.png' }]])
};

describe('toBestBattle', () => {
  it('keeps unknown values null, rounds counts and falls back to the account id for a nickname', () => {
    const battle = toBestBattle({ row, ...lookups });

    expect(battle?.damage).toBe(4322);
    expect(battle?.spotted).toBeNull();
    expect(battle?.nickname).toBe('42');
    expect(battle?.accountId).toBe(42);
  });

  it('resolves medal titles and keeps unknown medals by name', () => {
    const battle = toBestBattle({ row, ...lookups });

    expect(battle?.medals.map((medal) => medal.title)).toEqual(['Top Gun', 'unknownMedal']);
  });

  it('names the arena from the replay when the arena table lacks it', () => {
    expect(toBestBattle({ row, ...lookups })?.arena).toEqual({ arenaId: 'karelia', name: 'Karelia' });
  });

  it('drops a battle whose vehicle is unknown', () => {
    expect(toBestBattle({ row: { ...row, tank_id: 999 }, ...lookups })).toBeNull();
  });
});
