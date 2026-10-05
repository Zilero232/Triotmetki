import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { PlayerIdentityRow } from '../players.types';

import { asPrismaTransaction } from '../../../../../core';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../core/prisma/_tests/test-database';
import { claimDueActivePlayers, markSynced, touchNicknames, upsertPlayers } from '../players.queries';

const AT = {
  created: new Date('2020-01-01T00:00:00Z'),
  logout: new Date('2026-09-25T20:00:00Z'),
  seen: new Date('2026-09-26T12:00:00Z'),
  later: new Date('2026-09-27T12:00:00Z'),
  now: new Date('2026-09-26T12:00:00Z'),
  past: new Date('2026-09-26T11:00:00Z'),
  future: new Date('2026-09-26T13:00:00Z'),
  next: new Date('2026-09-26T12:15:00Z')
} as const;

const identity = (fields: Partial<PlayerIdentityRow> = {}): PlayerIdentityRow => ({
  accountId: 1n,
  nickname: 'Tanker',
  clanId: null,
  createdAt: AT.created,
  trackingTier: 'population',
  logoutAt: null,
  seenAt: AT.seen,
  ...fields
});

describeWithDatabase('tracking players queries', () => {
  const prisma = createTestPrisma();
  const db = prisma.$kysely;

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['player', 'player_nickname_history'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('upsertPlayers', () => {
    it('inserts new players with their identity and tier', async () => {
      await upsertPlayers({ db, rows: [identity({ accountId: 2n, clanId: 7n, trackingTier: 'active', logoutAt: AT.logout }), identity()] });

      const players = await prisma.player.findMany({ orderBy: { accountId: 'asc' } });

      expect(
        players.map(({ accountId, nickname, clanId, createdAt, trackingTier, logoutAt }) => ({
          accountId,
          nickname,
          clanId,
          createdAt,
          trackingTier,
          logoutAt
        }))
      ).toEqual([
        { accountId: 1n, nickname: 'Tanker', clanId: null, createdAt: AT.created, trackingTier: 'population', logoutAt: null },
        { accountId: 2n, nickname: 'Tanker', clanId: 7n, createdAt: AT.created, trackingTier: 'active', logoutAt: AT.logout }
      ]);
    });

    it('overwrites the identity of a known player but never clears a known logout or touches poll state', async () => {
      await prisma.player.create({
        data: {
          accountId: 1n,
          nickname: 'Old',
          clanId: 3n,
          trackingTier: 'dormant',
          logoutAt: AT.logout,
          lastPolledAt: AT.past,
          nextPollAt: AT.future
        }
      });

      await upsertPlayers({ db, rows: [identity({ nickname: 'New', clanId: null, trackingTier: 'active', logoutAt: null })] });

      expect(await prisma.player.findUniqueOrThrow({ where: { accountId: 1n } })).toMatchObject({
        nickname: 'New',
        clanId: null,
        trackingTier: 'active',
        createdAt: AT.created,
        logoutAt: AT.logout,
        lastPolledAt: AT.past,
        nextPollAt: AT.future
      });

      await upsertPlayers({ db, rows: [identity({ logoutAt: AT.later })] });

      expect((await prisma.player.findUniqueOrThrow({ where: { accountId: 1n } })).logoutAt).toEqual(AT.later);
    });
  });

  describe('touchNicknames', () => {
    it('records a new nickname and moves the last-seen time of a known one forward', async () => {
      await prisma.player.create({ data: { accountId: 1n, nickname: 'Tanker' } });
      await prisma.playerNickname.create({ data: { accountId: 1n, nickname: 'Tanker', firstSeenAt: AT.created, lastSeenAt: AT.created } });

      await touchNicknames({ db, rows: [identity({ seenAt: AT.later }), identity({ nickname: 'Renamed', seenAt: AT.later })] });

      const rows = await prisma.playerNickname.findMany({ orderBy: { nickname: 'asc' } });

      expect(rows.map(({ accountId, nickname, firstSeenAt, lastSeenAt }) => ({ accountId, nickname, firstSeenAt, lastSeenAt }))).toEqual([
        { accountId: 1n, nickname: 'Renamed', firstSeenAt: expect.any(Date), lastSeenAt: AT.later },
        { accountId: 1n, nickname: 'Tanker', firstSeenAt: AT.created, lastSeenAt: AT.later }
      ]);
    });
  });

  describe('markSynced', () => {
    it('stamps the poll times of the listed players only', async () => {
      await prisma.player.createMany({
        data: [
          { accountId: 1n, nickname: 'a', lastBattleAt: AT.created },
          { accountId: 2n, nickname: 'b' },
          { accountId: 3n, nickname: 'c', lastPolledAt: AT.past, nextPollAt: AT.future }
        ]
      });

      await markSynced({
        db,
        rows: [
          { accountId: 1, lastBattleAt: null, lastPolledAt: AT.now, nextPollAt: AT.next },
          { accountId: 2, lastBattleAt: AT.past, lastPolledAt: AT.now, nextPollAt: AT.future }
        ]
      });

      const players = await prisma.player.findMany({
        orderBy: { accountId: 'asc' },
        select: { accountId: true, lastBattleAt: true, lastPolledAt: true, nextPollAt: true }
      });

      expect(players).toEqual([
        { accountId: 1n, lastBattleAt: null, lastPolledAt: AT.now, nextPollAt: AT.next },
        { accountId: 2n, lastBattleAt: AT.past, lastPolledAt: AT.now, nextPollAt: AT.future },
        { accountId: 3n, lastBattleAt: null, lastPolledAt: AT.past, nextPollAt: AT.future }
      ]);
    });
  });

  describe('claimDueActivePlayers', () => {
    it('claims due active players, never-polled first, up to the limit, and moves their next poll', async () => {
      await prisma.player.createMany({
        data: [
          { accountId: 1n, nickname: 'due', trackingTier: 'active', nextPollAt: AT.past },
          { accountId: 2n, nickname: 'never', trackingTier: 'active', nextPollAt: null },
          { accountId: 3n, nickname: 'exactly-now', trackingTier: 'active', nextPollAt: AT.now },
          { accountId: 4n, nickname: 'not-due', trackingTier: 'active', nextPollAt: AT.future },
          { accountId: 5n, nickname: 'population', trackingTier: 'population', nextPollAt: AT.past }
        ]
      });

      expect(await claimDueActivePlayers({ db, now: AT.now, nextPollAt: AT.next, limit: 2 })).toEqual(expect.arrayContaining([1, 2]));

      const players = await prisma.player.findMany({ orderBy: { accountId: 'asc' }, select: { accountId: true, nextPollAt: true } });

      expect(players).toEqual([
        { accountId: 1n, nextPollAt: AT.next },
        { accountId: 2n, nextPollAt: AT.next },
        { accountId: 3n, nextPollAt: AT.now },
        { accountId: 4n, nextPollAt: AT.future },
        { accountId: 5n, nextPollAt: AT.past }
      ]);

      expect(await claimDueActivePlayers({ db, now: AT.now, nextPollAt: AT.next, limit: 10 })).toEqual([3]);
    });

    it('skips a due player another claim holds locked', async () => {
      await prisma.player.createMany({
        data: [
          { accountId: 1n, nickname: 'locked', trackingTier: 'active', nextPollAt: AT.past },
          { accountId: 2n, nickname: 'free', trackingTier: 'active', nextPollAt: AT.now }
        ]
      });

      const claimed = await prisma.$transaction(async (client) => {
        const tx = asPrismaTransaction(client);

        await tx.$kysely.selectFrom('player').select('account_id').where('account_id', '=', 1).forUpdate().execute();

        return claimDueActivePlayers({ db, now: AT.now, nextPollAt: AT.next, limit: 10 });
      });

      expect(claimed).toEqual([2]);
    });
  });
});
