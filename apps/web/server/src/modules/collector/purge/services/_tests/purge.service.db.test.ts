import type { Queue } from 'bullmq';

import { afterAll, beforeEach, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ObjectStorage } from '../../../../../core';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../core/prisma/_tests/test-database';
import { PURGE } from '../../config/purge.constants';
import { PURGE_QUERIES } from '../../queries/purge.queries';
import { PurgeService } from '../purge.service';
import { accountSnapshot, PURGE_SEED, replay, rngDaily, summaryPlayer, tankBattleDelta, tankSnapshot } from './purge.fixtures';

const { purged, kept, stranger } = PURGE_SEED;

describeWithDatabase('PurgeService.purgeAccount', () => {
  const prisma = createTestPrisma();

  const createPurge = () => {
    const storage = mock<ObjectStorage>();

    return { storage, purge: new PurgeService(prisma, mock<Queue>(), storage, PURGE_QUERIES) };
  };

  const seedAccounts = async () => {
    await prisma.player.createMany({ data: [purged, kept].map((accountId) => ({ accountId, nickname: `player-${accountId}` })) });
    await prisma.accountSnapshot.createMany({ data: [accountSnapshot(purged), accountSnapshot(kept)] });
    await prisma.tankSnapshot.createMany({ data: [tankSnapshot(purged), tankSnapshot(kept)] });
    await prisma.tankBattleDelta.createMany({ data: [tankBattleDelta(purged), tankBattleDelta(kept)] });
    await prisma.playerTank.createMany({ data: [purged, kept].map((accountId) => ({ accountId, tankId: PURGE_SEED.tankId })) });
    await prisma.clan.create({ data: { clanId: PURGE_SEED.clanId, tag: 'TAG', name: 'Clan' } });

    await prisma.clanMemberEvent.createMany({
      data: [purged, kept].map((accountId) => ({ accountId, clanId: PURGE_SEED.clanId, type: 'joined' as const, occurredAt: PURGE_SEED.capturedAt }))
    });

    await prisma.weeklyChallengeProgress.createMany({
      data: [purged, kept].map((accountId) => ({ accountId, weekStart: PURGE_SEED.weekStart, code: 'battles', progress: 1, target: 10 }))
    });
  };

  const openRequest = async (status: 'pending' | 'superseded' = 'pending') =>
    (await prisma.dataDeletionRequest.create({ data: { accountId: purged, source: 'lesta', status } })).id;

  const accountRowCounts = async (accountId: bigint) => ({
    accountSnapshots: await prisma.accountSnapshot.count({ where: { accountId } }),
    tankSnapshots: await prisma.tankSnapshot.count({ where: { accountId } }),
    tankBattleDeltas: await prisma.tankBattleDelta.count({ where: { accountId } }),
    players: await prisma.player.count({ where: { accountId } }),
    playerTanks: await prisma.playerTank.count({ where: { accountId } }),
    clanMemberEvents: await prisma.clanMemberEvent.count({ where: { accountId } }),
    weeklyChallengeProgress: await prisma.weeklyChallengeProgress.count({ where: { accountId } })
  });

  const replaySummary = async (storageKey: string) => (await prisma.replay.findUniqueOrThrow({ where: { storageKey } })).summary;

  const allRows = {
    accountSnapshots: 1,
    tankSnapshots: 1,
    tankBattleDeltas: 1,
    players: 1,
    playerTanks: 1,
    clanMemberEvents: 1,
    weeklyChallengeProgress: 1
  };

  const noRows = {
    accountSnapshots: 0,
    tankSnapshots: 0,
    tankBattleDeltas: 0,
    players: 0,
    playerTanks: 0,
    clanMemberEvents: 0,
    weeklyChallengeProgress: 0
  };

  beforeEach(async () => {
    await truncateTables({
      prisma,
      tables: [
        'player',
        'account_snapshot',
        'tank_snapshot',
        'tank_battle_delta',
        'clan',
        'clan_member_event',
        'weekly_challenge_progress',
        'replay',
        'rng_daily',
        'data_deletion_request'
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deletes the account from every hypertable and every relational table', async () => {
    await seedAccounts();

    await createPurge().purge.purgeAccount({ accountId: Number(purged), requestId: await openRequest(), isFinalAttempt: true });

    expect(await accountRowCounts(purged)).toEqual(noRows);
  });

  it('leaves every other account untouched', async () => {
    await seedAccounts();

    await createPurge().purge.purgeAccount({ accountId: Number(purged), requestId: await openRequest(), isFinalAttempt: true });

    expect(await accountRowCounts(kept)).toEqual(allRows);
  });

  it('completes the request it purged for', async () => {
    await seedAccounts();
    const requestId = await openRequest();

    await createPurge().purge.purgeAccount({ accountId: Number(purged), requestId, isFinalAttempt: true });

    const request = await prisma.dataDeletionRequest.findUniqueOrThrow({ where: { id: requestId } });

    expect([request.status, request.completedAt instanceof Date]).toEqual(['completed', true]);
  });

  it('purges without a request', async () => {
    await seedAccounts();

    await createPurge().purge.purgeAccount({ accountId: Number(purged), isFinalAttempt: true });

    expect(await accountRowCounts(purged)).toEqual(noRows);
  });

  it('keeps every row when the request was superseded before the purge started', async () => {
    await seedAccounts();
    const requestId = await openRequest('superseded');

    await createPurge().purge.purgeAccount({ accountId: Number(purged), requestId, isFinalAttempt: true });

    expect(await accountRowCounts(purged)).toEqual(allRows);
  });

  it('leaves a superseded request superseded', async () => {
    await seedAccounts();
    const requestId = await openRequest('superseded');

    await createPurge().purge.purgeAccount({ accountId: Number(purged), requestId, isFinalAttempt: true });

    expect((await prisma.dataDeletionRequest.findUniqueOrThrow({ where: { id: requestId } })).status).toBe('superseded');
  });

  it('deletes the replays the account recorded and removes their files', async () => {
    await prisma.replay.createMany({
      data: [replay('own', { accountId: purged, timelineKey: 'timelines/own.json' }), replay('other', { accountId: kept })]
    });

    const { storage, purge } = createPurge();

    await purge.purgeAccount({ accountId: Number(purged), isFinalAttempt: true });

    expect(await prisma.replay.findMany({ select: { storageKey: true } })).toEqual([{ storageKey: 'replays/other.mtreplay' }]);
    expect(storage.remove.mock.calls.map(([key]) => key).sort()).toEqual(['replays/own.mtreplay', 'timelines/own.json']);
  });

  it('replaces the account with the anonymous placeholder in the replays of other people', async () => {
    await prisma.replay.create({
      data: replay('shared', {
        accountId: kept,
        playerAccountIds: [kept, purged],
        summary: { recorder: { accountId: Number(kept), name: 'kept' }, players: [summaryPlayer(kept, 'kept'), summaryPlayer(purged, 'purged')] }
      })
    });

    await createPurge().purge.purgeAccount({ accountId: Number(purged), isFinalAttempt: true });

    expect(await replaySummary('replays/shared.mtreplay')).toEqual({
      recorder: { accountId: Number(kept), name: 'kept' },
      players: [summaryPlayer(kept, 'kept'), { ...summaryPlayer(null, PURGE.anonymousReplayName), clanTag: null }]
    });
  });

  it('anonymises the recorder of a replay the account recorded but did not upload as its own', async () => {
    await prisma.replay.create({
      data: replay('recorded', {
        playerAccountIds: [purged, stranger],
        summary: {
          recorder: { accountId: Number(purged), name: 'purged' },
          players: [summaryPlayer(purged, 'purged'), summaryPlayer(stranger, 'stranger')]
        }
      })
    });

    await createPurge().purge.purgeAccount({ accountId: Number(purged), isFinalAttempt: true });

    expect(await replaySummary('replays/recorded.mtreplay')).toEqual({
      recorder: { accountId: null, name: PURGE.anonymousReplayName },
      players: [{ ...summaryPlayer(null, PURGE.anonymousReplayName), clanTag: null }, summaryPlayer(stranger, 'stranger')]
    });
  });

  it('scrubs a summary that lists the account even when the player set misses it', async () => {
    await prisma.replay.create({
      data: replay('unindexed', { accountId: kept, summary: { players: [summaryPlayer(purged, 'purged')] } })
    });

    await createPurge().purge.purgeAccount({ accountId: Number(purged), isFinalAttempt: true });

    expect(await replaySummary('replays/unindexed.mtreplay')).toEqual({
      players: [{ ...summaryPlayer(null, PURGE.anonymousReplayName), clanTag: null }]
    });
  });

  it('leaves a summary without a player list as it is, recorder included', async () => {
    const summary = { recorder: { accountId: Number(purged), name: 'purged' } };

    await prisma.replay.create({ data: replay('listless', { accountId: kept, playerAccountIds: [purged], summary }) });

    await createPurge().purge.purgeAccount({ accountId: Number(purged), isFinalAttempt: true });

    expect(await replaySummary('replays/listless.mtreplay')).toEqual(summary);
  });

  it('leaves the summaries that never mention the account unchanged', async () => {
    const summary = { recorder: { accountId: Number(kept), name: 'kept' }, players: [summaryPlayer(kept, 'kept')] };

    await prisma.replay.create({ data: replay('foreign', { accountId: kept, playerAccountIds: [kept], summary }) });

    await createPurge().purge.purgeAccount({ accountId: Number(purged), isFinalAttempt: true });

    expect(await replaySummary('replays/foreign.mtreplay')).toEqual(summary);
  });

  it('drops the account from the player sets of other people replays', async () => {
    await prisma.replay.createMany({
      data: [
        replay('listed', { accountId: kept, playerAccountIds: [kept, purged, stranger] }),
        replay('listless', { accountId: kept, playerAccountIds: [purged], summary: { recorder: null } })
      ]
    });

    await createPurge().purge.purgeAccount({ accountId: Number(purged), isFinalAttempt: true });

    const rows = await prisma.replay.findMany({ select: { storageKey: true, playerAccountIds: true }, orderBy: { storageKey: 'asc' } });

    expect(rows).toEqual([
      { storageKey: 'replays/listed.mtreplay', playerAccountIds: [kept, stranger] },
      { storageKey: 'replays/listless.mtreplay', playerAccountIds: [] }
    ]);
  });

  it('drops the account from the honest-rng daily player sets', async () => {
    await prisma.rngDaily.createMany({ data: [rngDaily('all', [purged, kept]), rngDaily('tier10', [kept])] });

    await createPurge().purge.purgeAccount({ accountId: Number(purged), isFinalAttempt: true });

    const rows = await prisma.rngDaily.findMany({ select: { scope: true, players: true }, orderBy: { scope: 'asc' } });

    expect(rows).toEqual([
      { scope: 'all', players: [kept] },
      { scope: 'tier10', players: [kept] }
    ]);
  });
});
