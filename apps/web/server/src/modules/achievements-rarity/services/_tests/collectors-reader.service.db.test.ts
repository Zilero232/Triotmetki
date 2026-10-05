import { afterAll, beforeEach, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { EntitlementsService } from '../../../billing';
import { AchievementCatalogReaderService } from '../achievement-catalog-reader.service';
import { CollectorsReaderService } from '../collectors-reader.service';

const FETCHED_AT = new Date('2026-10-01T00:00:00Z');
const COMPUTED_AT = new Date('2026-10-05T06:45:00Z');
const CLAN = { clanId: 77, tag: 'RARE' } as const;

const ACCOUNT = { leader: 5001n, tiedLowId: 5002n, tiedHighId: 5003n, last: 5004n, hidden: 5005n, uncomputed: 5006n } as const;

describeWithDatabase('CollectorsReaderService.leaderboard', () => {
  const prisma = createTestPrisma();
  const service = new CollectorsReaderService(prisma, mock<AchievementCatalogReaderService>(), mock<EntitlementsService>());

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['account_achievements', 'player', 'clan'] });
    await prisma.clan.create({ data: { ...CLAN, name: 'Rare clan' } });

    await prisma.player.createMany({
      data: [
        { accountId: ACCOUNT.leader, nickname: 'leader', clanId: CLAN.clanId },
        { accountId: ACCOUNT.tiedLowId, nickname: 'tied-low' },
        { accountId: ACCOUNT.tiedHighId, nickname: 'tied-high', clanId: 404 },
        { accountId: ACCOUNT.last, nickname: 'last' },
        { accountId: ACCOUNT.hidden, nickname: 'hidden', isHidden: true },
        { accountId: ACCOUNT.uncomputed, nickname: 'uncomputed' }
      ]
    });

    await prisma.accountAchievements.createMany({
      data: [
        { accountId: ACCOUNT.leader, counts: {}, held: 5, points: 900, completion: 40, fetchedAt: FETCHED_AT, computedAt: COMPUTED_AT },
        { accountId: ACCOUNT.tiedHighId, counts: {}, held: 4, points: 500, completion: 30, fetchedAt: FETCHED_AT, computedAt: COMPUTED_AT },
        { accountId: ACCOUNT.tiedLowId, counts: {}, held: 4, points: 500, completion: 30, fetchedAt: FETCHED_AT, computedAt: COMPUTED_AT },
        { accountId: ACCOUNT.last, counts: {}, held: 9, points: 100, completion: 80, fetchedAt: FETCHED_AT, computedAt: COMPUTED_AT },
        { accountId: ACCOUNT.hidden, counts: {}, held: 9, points: 9999, completion: 99, fetchedAt: FETCHED_AT, computedAt: COMPUTED_AT },
        { accountId: ACCOUNT.uncomputed, counts: {}, held: 9, points: 9999, completion: 99, fetchedAt: FETCHED_AT }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('ranks visible computed collectors by points, then held, then account id', async () => {
    const view = await service.leaderboard({ limit: 10, offset: 0 });

    expect(view).toEqual({
      items: [
        { rank: 1, accountId: Number(ACCOUNT.leader), nickname: 'leader', clanTag: CLAN.tag, held: 5, points: 900, completion: 40 },
        { rank: 2, accountId: Number(ACCOUNT.tiedLowId), nickname: 'tied-low', clanTag: null, held: 4, points: 500, completion: 30 },
        { rank: 3, accountId: Number(ACCOUNT.tiedHighId), nickname: 'tied-high', clanTag: null, held: 4, points: 500, completion: 30 },
        { rank: 4, accountId: Number(ACCOUNT.last), nickname: 'last', clanTag: null, held: 9, points: 100, completion: 80 }
      ],
      total: 4,
      limit: 10,
      offset: 0
    });
  });

  it('pages with the offset carried into the rank', async () => {
    const view = await service.leaderboard({ limit: 2, offset: 1 });

    expect(view).toEqual({
      items: [
        { rank: 2, accountId: Number(ACCOUNT.tiedLowId), nickname: 'tied-low', clanTag: null, held: 4, points: 500, completion: 30 },
        { rank: 3, accountId: Number(ACCOUNT.tiedHighId), nickname: 'tied-high', clanTag: null, held: 4, points: 500, completion: 30 }
      ],
      total: 4,
      limit: 2,
      offset: 1
    });
  });
});
