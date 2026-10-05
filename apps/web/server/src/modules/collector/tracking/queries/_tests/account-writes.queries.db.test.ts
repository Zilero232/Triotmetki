import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import type { AccountModeRow, TankModeRow } from '../../lib/mode-stats';
import type { TankSnapshotRow } from '../../lib/snapshots';
import type { PlayerTankUpsertRow } from '../account-writes.types';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../core/prisma/_tests/test-database';
import { block, tankStats } from '../../lib/poll-pipeline/_tests/poll-pipeline.fixtures';
import { accountSnapshotRow, tankSnapshotRow } from '../../lib/snapshots';
import {
  refreshLatestTankSnapshots,
  updateLestaMarks,
  upsertAccountModeStats,
  upsertPlayerTanks,
  upsertRandomModeStats,
  upsertTankModeStats
} from '../account-writes.queries';

const AT = {
  first: new Date('2026-09-25T12:00:00Z'),
  second: new Date('2026-09-26T12:00:00Z')
} as const;

const snapshot = (fields: Partial<TankSnapshotRow> = {}): TankSnapshotRow => ({
  ...tankSnapshotRow({
    accountId: 1n,
    capturedAt: AT.first,
    mode: 'random',
    block: block(10),
    stats: tankStats({ tankId: 10, battles: 10 }),
    marksOnGun: 1
  }),
  avgDamageBlocked: 312.5,
  maxFrags: 4,
  maxXp: 1500,
  ...fields
});

const grown = (fields: Partial<TankSnapshotRow> = {}): TankSnapshotRow => ({
  ...tankSnapshotRow({
    accountId: 1n,
    capturedAt: AT.second,
    mode: 'random',
    block: block(14),
    stats: tankStats({ tankId: 10, battles: 14 }),
    marksOnGun: 2
  }),
  avgDamageBlocked: 320.25,
  markOfMastery: 3,
  maxFrags: 5,
  maxXp: 1700,
  ...fields
});

const tank = (fields: Partial<PlayerTankUpsertRow> = {}): PlayerTankUpsertRow => ({
  accountId: 1n,
  tankId: 10,
  battles: 5,
  wins: 3,
  markOfMastery: 2,
  lastBattleAt: AT.second,
  ...fields
});

const accountMode = (fields: Partial<AccountModeRow> = {}): AccountModeRow => ({
  accountId: 1n,
  mode: 'strongholdSkirmish',
  battles: 5,
  wins: 3,
  losses: 2,
  draws: 0,
  damageDealt: 9000n,
  damageReceived: 7000n,
  frags: 4,
  spotted: 3,
  xp: 3000n,
  survived: 2,
  hits: 20,
  shots: 25,
  capturePoints: 1,
  droppedCapturePoints: 2,
  avgDamageBlocked: 100.5,
  avgDamageAssisted: 250.25,
  maxDamage: 4000,
  maxXp: 1200,
  maxFrags: null,
  ...fields
});

const tankMode = (fields: Partial<TankModeRow> = {}): TankModeRow => ({
  accountId: 1n,
  tankId: 5,
  mode: 'epic',
  battles: 2,
  wins: 1,
  damageDealt: 3000,
  frags: 1,
  spotted: 0,
  xp: 900,
  survived: 1,
  ...fields
});

const randomSnapshot = ({ capturedAt, battles, maxDamage }: { capturedAt: Date; battles: number; maxDamage: number | null }) => ({
  ...accountSnapshotRow({ accountId: 1n, capturedAt, mode: 'random', block: block(battles), globalRating: 5000 }),
  avgDamageAssisted: 321.5,
  maxDamage,
  maxXp: 1800,
  maxFrags: null
});

describeWithDatabase('account write queries', () => {
  const prisma = createTestPrisma();
  const db = prisma.$kysely;

  const latestTanks = async () => prisma.tankSnapshotLatest.findMany({ orderBy: [{ accountId: 'asc' }, { tankId: 'asc' }, { mode: 'asc' }] });

  const playerTanks = async () =>
    prisma.playerTank.findMany({
      orderBy: [{ accountId: 'asc' }, { tankId: 'asc' }],
      select: {
        accountId: true,
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

  const accountModes = async () =>
    (await prisma.accountModeStats.findMany({ orderBy: { mode: 'asc' } })).map(({ updatedAt: _updatedAt, ...row }) => row);

  beforeEach(async () => {
    await truncateTables({
      prisma,
      tables: ['player', 'player_tank', 'tank_snapshot', 'tank_snapshot_latest', 'account_snapshot', 'account_mode_stats', 'tank_mode_stats']
    });

    await prisma.player.createMany({
      data: [
        { accountId: 1n, nickname: 'one' },
        { accountId: 2n, nickname: 'two' }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('refreshLatestTankSnapshots', () => {
    it('copies every column of the snapshots captured at that time into the latest table', async () => {
      const rows = [snapshot(), snapshot({ mode: 'all', battles: 12, marksOnGun: null }), snapshot({ tankId: 20 })];

      await prisma.tankSnapshot.createMany({ data: [...rows, snapshot({ tankId: 30, capturedAt: AT.second }), snapshot({ accountId: 2n })] });

      await refreshLatestTankSnapshots({ db, accountId: 1, capturedAt: AT.first });

      expect(await latestTanks()).toEqual([rows[1], rows[0], rows[2]]);
    });

    it('replaces every column of an older latest row', async () => {
      await prisma.tankSnapshot.createMany({ data: [snapshot(), grown()] });
      await prisma.tankSnapshotLatest.create({ data: snapshot() });

      await refreshLatestTankSnapshots({ db, accountId: 1, capturedAt: AT.second });

      expect(await latestTanks()).toEqual([grown()]);
    });

    it('keeps a latest row newer than the refreshed capture', async () => {
      await prisma.tankSnapshot.createMany({ data: [snapshot(), grown()] });
      await prisma.tankSnapshotLatest.create({ data: grown() });

      await refreshLatestTankSnapshots({ db, accountId: 1, capturedAt: AT.first });

      expect(await latestTanks()).toEqual([grown()]);
    });
  });

  describe('upsertPlayerTanks', () => {
    it('inserts new tanks and defaults missing counters to zero', async () => {
      await upsertPlayerTanks({
        db,
        rows: [tank(), tank({ tankId: 20, battles: undefined, wins: undefined, markOfMastery: undefined, lastBattleAt: undefined })]
      });

      expect(await playerTanks()).toEqual([
        {
          accountId: 1n,
          tankId: 10,
          battles: 5,
          wins: 3,
          markOfMastery: 2,
          lastBattleAt: AT.second,
          inGarage: null,
          marksOnGun: null,
          marksSource: 'lesta'
        },
        {
          accountId: 1n,
          tankId: 20,
          battles: 0,
          wins: 0,
          markOfMastery: 0,
          lastBattleAt: null,
          inGarage: null,
          marksOnGun: null,
          marksSource: 'lesta'
        }
      ]);
    });

    it('marks a just-played tank as in the garage once the account has a known garage', async () => {
      await prisma.playerTank.create({ data: { accountId: 1n, tankId: 99, inGarage: false } });

      await upsertPlayerTanks({ db, rows: [tank(), tank({ tankId: 20, lastBattleAt: undefined }), tank({ accountId: 2n })] });

      const garage = (await playerTanks()).map(({ accountId, tankId, inGarage }) => ({ accountId, tankId, inGarage }));

      expect(garage).toEqual([
        { accountId: 1n, tankId: 10, inGarage: true },
        { accountId: 1n, tankId: 20, inGarage: null },
        { accountId: 1n, tankId: 99, inGarage: false },
        { accountId: 2n, tankId: 10, inGarage: null }
      ]);
    });

    it('updates a known tank, keeps its last battle when none is given and never clears a garage flag', async () => {
      await prisma.playerTank.create({ data: { accountId: 1n, tankId: 10, battles: 4, wins: 2, lastBattleAt: AT.first, inGarage: false } });

      await upsertPlayerTanks({ db, rows: [tank({ lastBattleAt: undefined })] });

      expect(await playerTanks()).toEqual([
        {
          accountId: 1n,
          tankId: 10,
          battles: 5,
          wins: 3,
          markOfMastery: 2,
          lastBattleAt: AT.first,
          inGarage: false,
          marksOnGun: null,
          marksSource: 'lesta'
        }
      ]);
    });

    it('raises the garage flag of a known tank that was just played', async () => {
      await prisma.playerTank.create({ data: { accountId: 1n, tankId: 10, battles: 4, inGarage: false } });

      await upsertPlayerTanks({ db, rows: [tank()] });

      expect((await playerTanks())[0]?.inGarage).toBe(true);
    });

    it('never lets an older read lower the stored battle count', async () => {
      await prisma.playerTank.create({ data: { accountId: 1n, tankId: 10, battles: 9, wins: 6, markOfMastery: 3, lastBattleAt: AT.first } });

      await upsertPlayerTanks({ db, rows: [tank()] });

      expect(await playerTanks()).toEqual([
        {
          accountId: 1n,
          tankId: 10,
          battles: 9,
          wins: 6,
          markOfMastery: 3,
          lastBattleAt: AT.first,
          inGarage: null,
          marksOnGun: null,
          marksSource: 'lesta'
        }
      ]);
    });
  });

  describe('updateLestaMarks', () => {
    it('writes Lesta marks onto known tanks only, zero included, and stamps them as read from Lesta', async () => {
      await prisma.playerTank.createMany({
        data: [
          { accountId: 1n, tankId: 10, marksOnGun: 1, marksSource: 'mod' },
          { accountId: 1n, tankId: 20, marksOnGun: 2 },
          { accountId: 1n, tankId: 30, marksOnGun: 3 }
        ]
      });

      await updateLestaMarks({
        db,
        rows: [
          { accountId: 1n, tankId: 10, marks: 2 },
          { accountId: 1n, tankId: 20, marks: 0 },
          { accountId: 1n, tankId: 40, marks: 1 }
        ]
      });

      const marks = (await playerTanks()).map(({ tankId, marksOnGun, marksSource }) => ({ tankId, marksOnGun, marksSource }));

      expect(marks).toEqual([
        { tankId: 10, marksOnGun: 2, marksSource: 'lesta' },
        { tankId: 20, marksOnGun: 0, marksSource: 'lesta' },
        { tankId: 30, marksOnGun: 3, marksSource: 'lesta' }
      ]);
    });
  });

  describe('upsertAccountModeStats', () => {
    it('stores each mode under its database name and dates the records it carries', async () => {
      const before = new Date();

      await upsertAccountModeStats({
        db,
        rows: [accountMode(), accountMode({ mode: 'ranked', maxDamage: null, maxXp: null, avgDamageAssisted: null })]
      });

      const [skirmish, ranked] = await accountModes();

      expect(skirmish).toEqual({
        accountId: 1n,
        mode: 'strongholdSkirmish',
        battles: 5,
        wins: 3,
        losses: 2,
        draws: 0,
        damageDealt: 9000n,
        damageReceived: 7000n,
        frags: 4,
        spotted: 3,
        xp: 3000n,
        survived: 2,
        hits: 20,
        shots: 25,
        capturePoints: 1,
        droppedCapturePoints: 2,
        avgDamageBlocked: 100.5,
        avgDamageAssisted: 250.25,
        maxDamage: 4000,
        maxXp: 1200,
        maxFrags: null,
        maxDamageAt: expect.any(Date),
        maxXpAt: expect.any(Date),
        maxFragsAt: null
      });

      expect(skirmish?.maxDamageAt?.getTime()).toBeGreaterThanOrEqual(before.getTime() - 1000);
      expect(ranked).toMatchObject({ mode: 'ranked', maxDamage: null, maxDamageAt: null, maxXpAt: null, avgDamageAssisted: null });
    });

    it('moves a record date only when the record grows', async () => {
      await prisma.accountModeStats.create({
        data: { ...accountMode({ battles: 4, maxDamage: 4000, maxXp: 1000 }), maxDamageAt: AT.first, maxXpAt: AT.first }
      });

      await upsertAccountModeStats({ db, rows: [accountMode({ battles: 6, maxDamage: 4000, maxXp: 1300, maxFrags: 5 })] });

      const [row] = await accountModes();

      expect(row).toMatchObject({ battles: 6, maxDamage: 4000, maxDamageAt: AT.first, maxXp: 1300, maxFrags: 5 });
      expect(row?.maxXpAt?.getTime()).toBeGreaterThan(AT.first.getTime());
      expect(row?.maxFragsAt).toBeInstanceOf(Date);
    });

    it('never lets an older read lower the stored mode stats', async () => {
      await prisma.accountModeStats.create({ data: accountMode({ battles: 8, wins: 6 }) });

      await upsertAccountModeStats({ db, rows: [accountMode({ battles: 5, wins: 3 })] });

      expect(await accountModes()).toMatchObject([{ battles: 8, wins: 6 }]);
    });
  });

  describe('upsertRandomModeStats', () => {
    it('copies the random snapshot of that capture into the mode stats, dated by the capture', async () => {
      const first = randomSnapshot({ capturedAt: AT.first, battles: 100, maxDamage: 5000 });

      await prisma.accountSnapshot.createMany({ data: [first, randomSnapshot({ capturedAt: AT.second, battles: 104, maxDamage: 5200 })] });

      await upsertRandomModeStats({ db, accountId: 1, capturedAt: AT.first });

      expect(await accountModes()).toEqual([
        {
          accountId: 1n,
          mode: 'random',
          battles: first.battles,
          wins: first.wins,
          losses: first.losses,
          draws: first.draws,
          damageDealt: first.damageDealt,
          damageReceived: first.damageReceived,
          frags: first.frags,
          spotted: first.spotted,
          xp: first.xp,
          survived: first.survived,
          hits: first.hits,
          shots: first.shots,
          capturePoints: first.capturePoints,
          droppedCapturePoints: first.droppedCapturePoints,
          avgDamageBlocked: first.avgDamageBlocked,
          avgDamageAssisted: 321.5,
          maxDamage: 5000,
          maxXp: 1800,
          maxFrags: null,
          maxDamageAt: AT.first,
          maxXpAt: AT.first,
          maxFragsAt: null
        }
      ]);
    });

    it('moves a record date to the capture that grew the record', async () => {
      await prisma.accountSnapshot.createMany({
        data: [
          randomSnapshot({ capturedAt: AT.first, battles: 100, maxDamage: 5000 }),
          randomSnapshot({ capturedAt: AT.second, battles: 104, maxDamage: 5200 })
        ]
      });

      await upsertRandomModeStats({ db, accountId: 1, capturedAt: AT.first });
      await upsertRandomModeStats({ db, accountId: 1, capturedAt: AT.second });

      expect(await accountModes()).toMatchObject([{ battles: 104, maxDamage: 5200, maxDamageAt: AT.second, maxXp: 1800, maxXpAt: AT.first }]);
    });
  });

  describe('upsertTankModeStats', () => {
    it('writes tank mode stats per tank and mode and never lowers them', async () => {
      await prisma.tankModeStats.create({ data: tankMode({ tankId: 6, battles: 9 }) });

      await upsertTankModeStats({ db, rows: [tankMode(), tankMode({ mode: 'ranked', battles: 3 }), tankMode({ tankId: 6, battles: 4 })] });

      const rows = await prisma.tankModeStats.findMany({ orderBy: [{ tankId: 'asc' }, { mode: 'asc' }] });

      expect(rows.map(({ updatedAt: _updatedAt, ...row }) => row)).toEqual([
        { accountId: 1n, tankId: 5, mode: 'epic', battles: 2, wins: 1, damageDealt: 3000, frags: 1, spotted: 0, xp: 900, survived: 1 },
        { accountId: 1n, tankId: 5, mode: 'ranked', battles: 3, wins: 1, damageDealt: 3000, frags: 1, spotted: 0, xp: 900, survived: 1 },
        { accountId: 1n, tankId: 6, mode: 'epic', battles: 9, wins: 1, damageDealt: 3000, frags: 1, spotted: 0, xp: 900, survived: 1 }
      ]);
    });
  });
});
