import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { ARENA_BONUS_TYPE } from '../../../reference';
import { competitionBattles as competitionBattlesQuery } from '../competition-battles.queries';

const SEED = {
  accountId: 1_000_000_401n,
  otherAccountId: 1_000_000_402n,
  from: new Date('2026-09-28T00:00:00Z'),
  until: new Date('2026-10-05T00:00:00Z'),
  random: String(ARENA_BONUS_TYPE.regular),
  ranked: String(ARENA_BONUS_TYPE.ranked)
} as const;

const battle = ({
  accountId = SEED.accountId,
  arenaUniqueId,
  battleType = SEED.random,
  damageDealt,
  startedAt
}: {
  accountId?: bigint;
  arenaUniqueId: bigint;
  battleType?: string;
  damageDealt: number;
  startedAt: string;
}) => ({
  accountId,
  arenaUniqueId,
  tankId: 1,
  arenaId: 'map',
  battleType,
  result: 'win' as const,
  damageDealt,
  damageAssistedRadio: 100,
  damageAssistedTrack: 50,
  damageAssistedStun: 0,
  damageBlocked: 300,
  damageReceived: 0,
  spotted: 2,
  frags: 1,
  xp: 900,
  survived: true,
  startedAt: new Date(startedAt)
});

const corroboration = ({ accountId = SEED.accountId, capturedAt, damageDealt }: { accountId?: bigint; capturedAt: string; damageDealt: number }) => ({
  accountId,
  tankId: 1,
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

const line = (damageDealt: number) => ({
  tankId: 1,
  result: 'win',
  damageDealt,
  damageAssistedRadio: 100,
  damageAssistedTrack: 50,
  damageBlocked: 300,
  frags: 1,
  spotted: 2,
  xp: 900,
  survived: true
});

describeWithDatabase('competitionBattles', () => {
  const prisma = createTestPrisma();

  const competitionBattles = (limit: number) =>
    competitionBattlesQuery({
      db: prisma.$kysely,
      accountId: Number(SEED.accountId),
      battleTypes: [SEED.random],
      from: SEED.from,
      until: SEED.until,
      limit
    });

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'tank_battle_delta', 'replay', 'player'] });

    await prisma.player.createMany({
      data: [
        { accountId: SEED.accountId, nickname: 'first' },
        { accountId: SEED.otherAccountId, nickname: 'second' }
      ]
    });

    await prisma.battle.createMany({
      data: [
        battle({ arenaUniqueId: 1n, damageDealt: 3000, startedAt: '2026-09-29T10:00:00Z' }),
        battle({ arenaUniqueId: 2n, damageDealt: 2000, startedAt: '2026-09-28T10:00:00Z' }),
        battle({ arenaUniqueId: 3n, damageDealt: 9000, startedAt: '2026-09-30T10:00:00Z' }),
        battle({ arenaUniqueId: 4n, damageDealt: 1000, startedAt: '2026-09-27T10:00:00Z' }),
        battle({ arenaUniqueId: 5n, battleType: SEED.ranked, damageDealt: 1000, startedAt: '2026-09-29T12:00:00Z' }),
        battle({ accountId: SEED.otherAccountId, arenaUniqueId: 6n, damageDealt: 1000, startedAt: '2026-09-29T12:00:00Z' })
      ]
    });

    await prisma.tankBattleDelta.createMany({
      data: [
        corroboration({ capturedAt: '2026-09-29T10:30:00Z', damageDealt: 3000 }),
        corroboration({ capturedAt: '2026-09-28T10:30:00Z', damageDealt: 2000 }),
        corroboration({ capturedAt: '2026-09-27T10:30:00Z', damageDealt: 1000 }),
        corroboration({ accountId: SEED.otherAccountId, capturedAt: '2026-09-29T12:30:00Z', damageDealt: 1000 })
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists the corroborated battles of the mode inside the window, oldest first', async () => {
    expect(await competitionBattles(10)).toEqual([line(2000), line(3000)]);
  });

  it('stops at the limit', async () => {
    expect(await competitionBattles(1)).toEqual([line(2000)]);
  });
});
