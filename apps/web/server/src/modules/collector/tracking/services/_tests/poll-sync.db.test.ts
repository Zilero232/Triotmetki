import { addMinutes, getUnixTime, subMinutes } from 'date-fns';
import { afterAll, afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AccountInfo, AccountTank, TankStats } from '../../../../../lib/lesta';
import type { GainedMark } from '../../lib/marks-gain';
import type { FakeLestaInput } from '../../lib/poll-pipeline/_tests/poll-pipeline.fixtures.types';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../core/prisma/_tests/test-database';
import { ExpectedValuesReaderService } from '../../../../reference';
import { PurgeGuardService } from '../../../purge';
import { accountInfo, accountTank, block, createFakeLesta, tankStats } from '../../lib/poll-pipeline/_tests/poll-pipeline.fixtures';
import { ACCOUNT_WRITE_QUERIES } from '../../queries/account-writes.queries';
import { PLAYER_QUERIES } from '../../queries/players.queries';
import { AccountWriterService } from '../account-writer.service';
import { PlayerWriterService } from '../player-writer.service';
import { PollSyncService } from '../poll-sync.service';
import { RatingsTriggerService } from '../ratings-trigger.service';
import { TrackingAnnounceService } from '../tracking-announce.service';
import { TrackingLestaService } from '../tracking-lesta.service';

const AT = {
  first: new Date('2026-09-26T09:00:00Z'),
  second: new Date('2026-09-26T11:00:00Z')
} as const;

const LAST_BATTLE = {
  first: subMinutes(AT.first, 60),
  second: subMinutes(AT.second, 10)
} as const;

const EXPECTED = new Map([[10, { tankId: 10, expDamage: 1500, expSpot: 1.5, expFrag: 0.9, expDef: 0.8, expWinRate: 52 }]]);

const TABLES = [
  'player',
  'player_nickname_history',
  'player_clan_history',
  'player_tank',
  'account_snapshot',
  'tank_snapshot',
  'tank_snapshot_latest',
  'tank_battle_delta',
  'account_mode_stats',
  'tank_mode_stats',
  'play_session',
  'account_rating',
  'data_deletion_request'
] as const;

const info = ({ battles, lastBattleAt, clanId }: { battles: number; lastBattleAt: Date; clanId: number }): AccountInfo => {
  const base = accountInfo({ accountId: 1, battles, lastBattleTime: getUnixTime(lastBattleAt) });

  return { ...base, clan_id: clanId, statistics: { ...base.statistics, epic: { ...block(battles - 130), max_damage: 3000, max_xp: 900 } } };
};

const stats = (tankId: number, battles: number): TankStats => ({ ...tankStats({ tankId, battles }), epic: block(4) });

const tank = ({ tankId, battles, mastery = 1 }: { tankId: number; battles: number; mastery?: number }): AccountTank => ({
  ...accountTank({ tankId, battles }),
  mark_of_mastery: mastery
});

const FIRST_POLL: FakeLestaInput = {
  infos: { 1: info({ battles: 150, lastBattleAt: LAST_BATTLE.first, clanId: 7 }) },
  tanks: { 1: [tank({ tankId: 10, battles: 100 }), tank({ tankId: 20, battles: 50 }), tank({ tankId: 30, battles: 0 })] },
  stats: { 1: [stats(10, 100), stats(20, 50)] },
  marks: { 1: { 10: 1, 20: 0 } }
};

const SECOND_POLL: FakeLestaInput = {
  infos: { 1: info({ battles: 153, lastBattleAt: LAST_BATTLE.second, clanId: 8 }) },
  tanks: { 1: [tank({ tankId: 10, battles: 103 }), tank({ tankId: 20, battles: 50, mastery: 2 }), tank({ tankId: 30, battles: 0 })] },
  stats: { 1: [stats(10, 103), stats(20, 50)] },
  marks: { 1: { 10: 2, 20: 0 } }
};

describeWithDatabase('poll sync on the database', () => {
  const prisma = createTestPrisma();
  const gained: GainedMark[][] = [];

  const createSync = () => {
    const lesta = mock<TrackingLestaService>();
    const announce = mock<TrackingAnnounceService>();
    const expected = mock<ExpectedValuesReaderService>();

    lesta.port.mockReturnValueOnce(createFakeLesta(FIRST_POLL)).mockReturnValueOnce(createFakeLesta(SECOND_POLL));
    announce.subscribers.mockResolvedValue(new Set());

    announce.announceMarks.mockImplementation(async (marks) => {
      gained.push([...marks]);
    });

    expected.all.mockResolvedValue(EXPECTED);

    return new PollSyncService(
      lesta,
      new PlayerWriterService(prisma, announce, PLAYER_QUERIES),
      new AccountWriterService(prisma, announce, expected, ACCOUNT_WRITE_QUERIES),
      new PurgeGuardService(prisma),
      mock<RatingsTriggerService>()
    );
  };

  const poll = async () => {
    const sync = createSync();

    vi.setSystemTime(AT.first);
    const first = await sync.run({ accountIds: [1], lane: 'priority', tier: 'active' });

    vi.setSystemTime(AT.second);
    const second = await sync.run({ accountIds: [1], lane: 'priority', tier: 'active' });

    return { first, second };
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    gained.length = 0;
    await truncateTables({ prisma, tables: [...TABLES] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reports a baseline poll and an incremental poll', async () => {
    const { first, second } = await poll();

    expect(first).toEqual({ requested: 1, blocked: [], missing: [], unchanged: [], updated: [1], failed: [], snapshots: 6, deltas: 0 });
    expect(second).toEqual({ requested: 1, blocked: [], missing: [], unchanged: [], updated: [1], failed: [], snapshots: 4, deltas: 2 });
  });

  it('keeps the player identity, the poll schedule and the clan history', async () => {
    await poll();

    const player = await prisma.player.findUniqueOrThrow({ where: { accountId: 1n } });
    const clans = await prisma.playerClanHistory.findMany({ orderBy: { clanId: 'asc' }, select: { clanId: true, joinedAt: true, leftAt: true } });
    const nicknames = await prisma.playerNickname.findMany({ select: { nickname: true, lastSeenAt: true } });

    expect(player).toMatchObject({
      nickname: 'player_1',
      clanId: 8n,
      trackingTier: 'active',
      lastBattleAt: LAST_BATTLE.second,
      lastPolledAt: AT.second,
      nextPollAt: addMinutes(AT.second, 15)
    });

    expect(clans).toEqual([
      { clanId: 7n, joinedAt: null, leftAt: AT.second },
      { clanId: 8n, joinedAt: AT.second, leftAt: null }
    ]);

    expect(nicknames).toEqual([{ nickname: 'player_1', lastSeenAt: AT.second }]);
  });

  it('writes account and tank snapshots only when the battle count moved', async () => {
    await poll();

    const accounts = await prisma.accountSnapshot.findMany({
      orderBy: [{ capturedAt: 'asc' }, { mode: 'asc' }],
      select: { mode: true, capturedAt: true, battles: true }
    });

    const tanks = await prisma.tankSnapshot.findMany({
      orderBy: [{ capturedAt: 'asc' }, { tankId: 'asc' }, { mode: 'asc' }],
      select: { tankId: true, mode: true, capturedAt: true, battles: true, marksOnGun: true, markOfMastery: true }
    });

    expect(accounts).toEqual([
      { mode: 'all', capturedAt: AT.first, battles: 160 },
      { mode: 'random', capturedAt: AT.first, battles: 150 },
      { mode: 'all', capturedAt: AT.second, battles: 163 },
      { mode: 'random', capturedAt: AT.second, battles: 153 }
    ]);

    expect(tanks).toEqual([
      { tankId: 10, mode: 'all', capturedAt: AT.first, battles: 100, marksOnGun: 1, markOfMastery: 1 },
      { tankId: 10, mode: 'random', capturedAt: AT.first, battles: 100, marksOnGun: 1, markOfMastery: 1 },
      { tankId: 20, mode: 'all', capturedAt: AT.first, battles: 50, marksOnGun: 0, markOfMastery: 1 },
      { tankId: 20, mode: 'random', capturedAt: AT.first, battles: 50, marksOnGun: 0, markOfMastery: 1 },
      { tankId: 10, mode: 'all', capturedAt: AT.second, battles: 103, marksOnGun: 2, markOfMastery: 1 },
      { tankId: 10, mode: 'random', capturedAt: AT.second, battles: 103, marksOnGun: 2, markOfMastery: 1 }
    ]);
  });

  it('keeps the latest snapshot of every tank and mode', async () => {
    await poll();

    const latest = await prisma.tankSnapshotLatest.findMany({ orderBy: [{ tankId: 'asc' }, { mode: 'asc' }] });
    const newest = await prisma.tankSnapshot.findMany({
      where: { OR: [{ tankId: 10, capturedAt: AT.second }, { tankId: 20 }] },
      orderBy: [{ tankId: 'asc' }, { mode: 'asc' }]
    });

    expect(latest).toEqual(newest);
  });

  it('writes one delta per moved tank and mode', async () => {
    await poll();

    const deltas = await prisma.tankBattleDelta.findMany({ orderBy: { mode: 'asc' } });

    expect(deltas.map(({ cohort: _cohort, accountWinRate: _rate, ...delta }) => delta)).toEqual(
      ['all', 'random'].map((mode) => ({
        accountId: 1n,
        tankId: 10,
        mode,
        capturedAt: AT.second,
        battles: 3,
        wins: 1,
        damageDealt: 5400,
        damageBlocked: 900,
        frags: 3,
        spotted: 6,
        xp: 2400,
        survived: 1,
        hits: 21,
        shots: 27,
        capturePoints: 3,
        droppedCapturePoints: 3
      }))
    );

    expect(deltas.map(({ cohort, accountWinRate }) => ({ cohort, accountWinRate }))).toEqual([
      { cohort: 'beginner', accountWinRate: 54.90196078431372 },
      { cohort: 'beginner', accountWinRate: 54.90196078431372 }
    ]);
  });

  it('keeps the garage, mastery, last battle and marks of every tank', async () => {
    await poll();

    const tanks = await prisma.playerTank.findMany({
      orderBy: { tankId: 'asc' },
      select: {
        tankId: true,
        battles: true,
        wins: true,
        markOfMastery: true,
        lastBattleAt: true,
        inGarage: true,
        marksOnGun: true,
        marksSource: true
      }
    });

    expect(tanks).toEqual([
      { tankId: 10, battles: 103, wins: 56, markOfMastery: 1, lastBattleAt: LAST_BATTLE.second, inGarage: null, marksOnGun: 2, marksSource: 'lesta' },
      { tankId: 20, battles: 50, wins: 27, markOfMastery: 2, lastBattleAt: LAST_BATTLE.first, inGarage: null, marksOnGun: 0, marksSource: 'lesta' }
    ]);
  });

  it('announces the mark gained on the second poll only', async () => {
    await poll();

    expect(gained).toEqual([[], [{ accountId: 1n, tankId: 10, marks: 2, previous: 1 }]]);
  });

  it('keeps the account and tank mode stats', async () => {
    await poll();

    const modes = await prisma.accountModeStats.findMany({
      orderBy: { mode: 'asc' },
      select: { mode: true, battles: true, wins: true, damageDealt: true, maxDamage: true, maxDamageAt: true, maxXp: true, maxXpAt: true }
    });

    const tankModes = await prisma.tankModeStats.findMany({
      orderBy: { tankId: 'asc' },
      select: { tankId: true, mode: true, battles: true, damageDealt: true }
    });

    expect(modes).toEqual([
      { mode: 'random', battles: 153, wins: 84, damageDealt: 275_400n, maxDamage: null, maxDamageAt: null, maxXp: null, maxXpAt: null },
      {
        mode: 'epic',
        battles: 23,
        wins: 12,
        damageDealt: 41_400n,
        maxDamage: 3000,
        maxDamageAt: expect.any(Date),
        maxXp: 900,
        maxXpAt: expect.any(Date)
      }
    ]);

    expect(tankModes).toEqual([
      { tankId: 10, mode: 'epic', battles: 4, damageDealt: 7200 },
      { tankId: 20, mode: 'epic', battles: 4, damageDealt: 7200 }
    ]);
  });

  it('rebuilds the api day session from the day deltas', async () => {
    await poll();

    const sessions = await prisma.playSession.findMany();

    expect(sessions.map(({ id: _id, ...session }) => session)).toEqual([
      expect.objectContaining({
        accountId: 1n,
        source: 'api',
        kind: 'day',
        status: 'closed',
        day: new Date('2026-09-26T00:00:00Z'),
        startedAt: AT.second,
        endedAt: AT.second,
        battles: 3,
        wins: 1,
        damageDealt: 5400,
        damageBlocked: 900,
        frags: 3,
        spotted: 6,
        xp: 2400,
        survived: 1
      })
    ]);
  });
});
