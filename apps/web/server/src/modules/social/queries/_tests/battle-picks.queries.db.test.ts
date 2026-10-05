import { afterAll, beforeEach, expect, it } from 'vitest';

import { ARENA_BONUS_TYPE } from '../../../../common/lib';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { challengeBattles } from '../weekly-challenge.queries';
import { wrappedBestBattle } from '../wrapped.queries';

const SEED = {
  accountId: 1_000_000_301n,
  otherAccountId: 1_000_000_302n,
  start: new Date('2026-09-28T00:00:00Z'),
  end: new Date('2026-10-05T00:00:00Z'),
  random: String(ARENA_BONUS_TYPE.regular),
  ranked: String(ARENA_BONUS_TYPE.ranked)
} as const;

const battle = ({
  accountId = SEED.accountId,
  arenaUniqueId,
  tankId = 1,
  battleType = SEED.random,
  damageDealt,
  startedAt
}: {
  accountId?: bigint;
  arenaUniqueId: bigint;
  tankId?: number;
  battleType?: string;
  damageDealt: number;
  startedAt: string;
}) => ({
  accountId,
  arenaUniqueId,
  tankId,
  arenaId: 'map',
  battleType,
  result: 'win' as const,
  damageDealt,
  damageAssistedRadio: 0,
  damageAssistedTrack: 0,
  damageAssistedStun: 0,
  damageBlocked: 0,
  damageReceived: 0,
  spotted: 0,
  frags: 1,
  xp: 0,
  survived: true,
  startedAt: new Date(startedAt)
});

const corroboration = ({
  accountId = SEED.accountId,
  tankId = 1,
  capturedAt,
  damageDealt
}: {
  accountId?: bigint;
  tankId?: number;
  capturedAt: string;
  damageDealt: number;
}) => ({
  accountId,
  tankId,
  mode: 'random' as const,
  capturedAt: new Date(capturedAt),
  cohort: 'average' as const,
  accountWinRate: 50,
  battles: 1,
  wins: 1,
  damageDealt,
  damageBlocked: 0,
  frags: 1,
  spotted: 0,
  xp: 0,
  survived: 0,
  hits: 0,
  shots: 0,
  capturePoints: 0,
  droppedCapturePoints: 0
});

describeWithDatabase('battle picks', () => {
  const prisma = createTestPrisma();

  const window = { db: prisma.$kysely, start: SEED.start, end: SEED.end };

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'tank_battle_delta', 'replay', 'player'] });

    await prisma.player.createMany({
      data: [
        { accountId: SEED.accountId, nickname: 'first' },
        { accountId: SEED.otherAccountId, nickname: 'second' }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('keeps the corroborated battles of the accounts inside the week', async () => {
    await prisma.battle.createMany({
      data: [
        battle({ arenaUniqueId: 1n, damageDealt: 3000, startedAt: '2026-09-29T10:00:00Z' }),
        battle({ arenaUniqueId: 2n, damageDealt: 9000, startedAt: '2026-09-29T11:00:00Z' }),
        battle({ arenaUniqueId: 3n, damageDealt: 1000, startedAt: '2026-09-27T23:00:00Z' }),
        battle({ arenaUniqueId: 4n, battleType: SEED.ranked, damageDealt: 5000, startedAt: '2026-09-30T10:00:00Z' }),
        battle({ accountId: SEED.otherAccountId, arenaUniqueId: 5n, tankId: 2, damageDealt: 2500, startedAt: '2026-10-01T10:00:00Z' })
      ]
    });

    await prisma.tankBattleDelta.createMany({
      data: [
        corroboration({ capturedAt: '2026-09-29T10:30:00Z', damageDealt: 3000 }),
        corroboration({ capturedAt: '2026-09-28T00:30:00Z', damageDealt: 1000 }),
        corroboration({ accountId: SEED.otherAccountId, tankId: 2, capturedAt: '2026-10-01T10:30:00Z', damageDealt: 2600 })
      ]
    });

    const rows = await challengeBattles({ ...window, accountIds: [Number(SEED.accountId), Number(SEED.otherAccountId)] });

    expect(rows.toSorted((left, right) => left.damageDealt - right.damageDealt)).toEqual([
      { accountId: Number(SEED.otherAccountId), tankId: 2, damageDealt: 2500 },
      { accountId: Number(SEED.accountId), tankId: 1, damageDealt: 3000 }
    ]);
  });

  it('picks the highest-damage trusted battle of the year, counting uncorroborated non-random battles', async () => {
    await prisma.battle.createMany({
      data: [
        battle({ arenaUniqueId: 1n, damageDealt: 3000, startedAt: '2026-09-29T10:00:00Z' }),
        battle({ arenaUniqueId: 2n, damageDealt: 9000, startedAt: '2026-09-29T11:00:00Z' }),
        battle({ arenaUniqueId: 4n, battleType: SEED.ranked, tankId: 3, damageDealt: 5000, startedAt: '2026-09-30T10:00:00Z' }),
        battle({ arenaUniqueId: 6n, battleType: SEED.ranked, damageDealt: 8000, startedAt: '2026-10-06T10:00:00Z' })
      ]
    });

    await prisma.tankBattleDelta.createMany({ data: [corroboration({ capturedAt: '2026-09-29T10:30:00Z', damageDealt: 3000 })] });

    expect(await wrappedBestBattle({ ...window, accountId: Number(SEED.accountId) })).toMatchObject({
      tankId: 3,
      damageDealt: 5000,
      frags: 1,
      startedAt: new Date('2026-09-30T10:00:00Z'),
      arenaUniqueId: 4
    });
  });

  it('has no best battle without trusted battles', async () => {
    await prisma.battle.createMany({ data: [battle({ arenaUniqueId: 2n, damageDealt: 9000, startedAt: '2026-09-29T11:00:00Z' })] });

    expect(await wrappedBestBattle({ ...window, accountId: Number(SEED.accountId) })).toBeUndefined();
  });
});
