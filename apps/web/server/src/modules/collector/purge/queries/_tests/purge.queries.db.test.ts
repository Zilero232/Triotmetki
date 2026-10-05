import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../core/prisma/_tests/test-database';
import { accountSnapshot, PURGE_SEED, replay, rngDaily, summaryPlayer, tankBattleDelta, tankSnapshot } from '../../services/_tests/purge.fixtures';
import { deleteAccountTimeSeries, removeAccountFromReplayPlayers, removeAccountFromRngPlayers, scrubReplayPlayer } from '../purge.queries';

const { purged, kept } = PURGE_SEED;
const PLACEHOLDER = 'anonymous';

describeWithDatabase('purge queries', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['account_snapshot', 'tank_snapshot', 'tank_battle_delta', 'replay', 'rng_daily'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('deleteAccountTimeSeries', () => {
    it('deletes the account rows of every hypertable and keeps the other accounts', async () => {
      await prisma.accountSnapshot.createMany({ data: [accountSnapshot(purged), accountSnapshot(kept)] });
      await prisma.tankSnapshot.createMany({ data: [tankSnapshot(purged), tankSnapshot(kept)] });
      await prisma.tankBattleDelta.createMany({ data: [tankBattleDelta(purged), tankBattleDelta(kept)] });

      await deleteAccountTimeSeries({ db: prisma.$kysely, accountId: Number(purged) });

      const remaining = await Promise.all([
        prisma.accountSnapshot.findMany({ select: { accountId: true } }),
        prisma.tankSnapshot.findMany({ select: { accountId: true } }),
        prisma.tankBattleDelta.findMany({ select: { accountId: true } })
      ]);

      expect(remaining).toEqual([[{ accountId: kept }], [{ accountId: kept }], [{ accountId: kept }]]);
    });
  });

  describe('scrubReplayPlayer', () => {
    it('anonymises the account as recorder and as player, keeping the order of the list', async () => {
      await prisma.replay.create({
        data: replay('shared', {
          playerAccountIds: [purged, kept],
          summary: {
            recorder: { accountId: Number(purged), name: 'purged' },
            players: [summaryPlayer(purged, 'purged'), summaryPlayer(kept, 'kept')]
          }
        })
      });

      await scrubReplayPlayer({ db: prisma.$kysely, accountId: Number(purged), placeholder: PLACEHOLDER });

      expect((await prisma.replay.findFirstOrThrow()).summary).toEqual({
        recorder: { accountId: null, name: PLACEHOLDER },
        players: [{ ...summaryPlayer(null, PLACEHOLDER), clanTag: null }, summaryPlayer(kept, 'kept')]
      });
    });

    it('keeps the player set as it is', async () => {
      await prisma.replay.create({
        data: replay('shared', { playerAccountIds: [purged, kept], summary: { players: [summaryPlayer(purged, 'purged')] } })
      });

      await scrubReplayPlayer({ db: prisma.$kysely, accountId: Number(purged), placeholder: PLACEHOLDER });

      expect((await prisma.replay.findFirstOrThrow()).playerAccountIds).toEqual([purged, kept]);
    });
  });

  describe('removeAccountFromReplayPlayers', () => {
    it('drops the account from every replay player set that holds it', async () => {
      await prisma.replay.createMany({ data: [replay('a', { playerAccountIds: [purged, kept] }), replay('b', { playerAccountIds: [kept] })] });

      await removeAccountFromReplayPlayers({ db: prisma.$kysely, accountId: Number(purged) });

      const rows = await prisma.replay.findMany({ select: { playerAccountIds: true }, orderBy: { storageKey: 'asc' } });

      expect(rows).toEqual([{ playerAccountIds: [kept] }, { playerAccountIds: [kept] }]);
    });
  });

  describe('removeAccountFromRngPlayers', () => {
    it('drops the account from every honest-rng daily player set that holds it', async () => {
      await prisma.rngDaily.createMany({ data: [rngDaily('all', [kept, purged]), rngDaily('tier10', [purged])] });

      await removeAccountFromRngPlayers({ db: prisma.$kysely, accountId: Number(purged) });

      const rows = await prisma.rngDaily.findMany({ select: { players: true }, orderBy: { scope: 'asc' } });

      expect(rows).toEqual([{ players: [kept] }, { players: [] }]);
    });
  });
});
