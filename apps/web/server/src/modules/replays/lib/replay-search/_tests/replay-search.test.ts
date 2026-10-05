import { describe, expect, it } from 'vitest';

import { insensitiveEquals } from '../../../../../common/lib';
import { replaySearchQuerySchema } from '../../../dto/replays.schemas';
import { publicReplayWhere, searchOrder, searchWhere } from '../replay-search';

const query = (raw: Record<string, string>) => replaySearchQuerySchema.parse(raw);

describe('searchWhere', () => {
  it('only ever lists public parsed replays', () => {
    expect(searchWhere({ query: query({}), playerAccountId: null, tankIds: null })).toEqual(publicReplayWhere);
  });

  it('maps every filter onto its column', () => {
    const where = searchWhere({
      query: query({ tankId: '1', arenaId: '05_prohorovka', mode: 'ctf', minDamage: '3000', result: 'win' }),
      playerAccountId: null,
      tankIds: null
    });

    expect(where).toMatchObject({ tankId: 1, arenaId: '05_prohorovka', gameplayMode: 'ctf', result: 'win', damageDealt: { gte: 3000 } });
  });

  it('maps the extended filters onto their columns', () => {
    const where = searchWhere({
      query: query({ clan: 'ABC', minAssist: '1000', minBlocked: '2000', minFrags: '3', mastery: '4', version: '2.1.0', tags: 'kolobanov,warrior' }),
      playerAccountId: null,
      tankIds: null
    });

    expect(where).toMatchObject({
      clanTag: insensitiveEquals('ABC'),
      damageAssisted: { gte: 1000 },
      damageBlocked: { gte: 2000 },
      frags: { gte: 3 },
      markOfMastery: 4,
      gameVersion: '2.1.0',
      tags: { hasEvery: ['kolobanov', 'warrior'] }
    });
  });

  it('narrows to the tanks the tier, class and nation filters matched', () => {
    expect(searchWhere({ query: query({}), playerAccountId: null, tankIds: [1, 2] }).tankId).toEqual({ in: [1, 2] });
  });

  it('keeps an explicit tank only when it is among the matched tanks', () => {
    expect(searchWhere({ query: query({ tankId: '2' }), playerAccountId: null, tankIds: [1, 2] }).tankId).toEqual({ in: [2] });
    expect(searchWhere({ query: query({ tankId: '3' }), playerAccountId: null, tankIds: [1, 2] }).tankId).toEqual({ in: [] });
  });

  it('matches the clan tag literally, so an underscore is not a LIKE wildcard', () => {
    expect(searchWhere({ query: query({ clan: 'A_B' }), playerAccountId: null, tankIds: null }).clanTag).toEqual({
      equals: String.raw`A\_B`,
      mode: 'insensitive'
    });
  });

  it('refuses an unknown tag', () => {
    expect(replaySearchQuerySchema.safeParse({ tags: 'lucky' }).success).toBe(false);
  });

  it('prefers an explicit account id over a resolved nickname', () => {
    expect(searchWhere({ query: query({ accountId: '7' }), playerAccountId: 9n, tankIds: null }).playerAccountIds).toEqual({ has: 7n });
    expect(searchWhere({ query: query({}), playerAccountId: 9n, tankIds: null }).playerAccountIds).toEqual({ has: 9n });
  });

  it('treats a zero minimum as a filter, not as absent', () => {
    expect(searchWhere({ query: query({ minDamage: '0' }), playerAccountId: null, tankIds: null }).damageDealt).toEqual({ gte: 0 });
    expect(searchWhere({ query: query({ minFrags: '0' }), playerAccountId: null, tankIds: null }).frags).toEqual({ gte: 0 });
  });
});

describe('searchOrder', () => {
  it('breaks ties on the play date for every sort', () => {
    for (const sort of ['damage', 'xp', 'views'] as const) {
      expect(searchOrder(sort)).toContainEqual({ playedAt: 'desc' });
    }
  });

  it('ends on the unique id so offset pages never repeat or skip a replay', () => {
    for (const sort of ['recent', 'damage', 'xp', 'views'] as const) {
      expect(searchOrder(sort).at(-1)).toEqual({ id: 'desc' });
    }
  });
});
