import { sortBy } from 'remeda';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { battleRow, STAT_SEED } from '../../../../core/prisma/_tests/stat-seeds';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { mapStats, platoonMates, platoonSplit, tankReference } from '../battle-stats.queries';

const WINDOW = {
  from: new Date('2026-09-28T00:00:00Z'),
  inside: new Date('2026-10-01T10:00:00Z'),
  before: new Date('2026-09-01T10:00:00Z')
} as const;

const HIDDEN_ID = 1_000_000_003n;

const OWN = { accountId: Number(STAT_SEED.accountId), battleType: '1', from: WINDOW.from } as const;

const later = (minutes: number) => new Date(WINDOW.inside.getTime() + minutes * 60_000);

describeWithDatabase('battle stats queries', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'player'] });

    await prisma.player.createMany({
      data: [
        { accountId: STAT_SEED.accountId, nickname: 'owner' },
        { accountId: STAT_SEED.mateId, nickname: 'mate' },
        { accountId: HIDDEN_ID, nickname: 'hidden', isHidden: true }
      ]
    });

    await prisma.battle.createMany({
      data: [
        battleRow({ arenaUniqueId: 1n, startedAt: later(1), arenaId: 'map_a', team: 1, platoonSize: 2 }),
        battleRow({ arenaUniqueId: 2n, startedAt: later(2), arenaId: 'map_a', team: 1, result: 'loss', damageDealt: 500, survived: false }),
        battleRow({
          arenaUniqueId: 3n,
          startedAt: later(3),
          arenaId: 'map_b',
          team: 2,
          tankId: STAT_SEED.otherTankId,
          damageDealt: 2000,
          capturePoints: 3,
          droppedCapturePoints: 4,
          platoonSize: 1
        }),
        battleRow({ arenaUniqueId: 4n, startedAt: later(4), battleType: '22' }),
        battleRow({ arenaUniqueId: 5n, startedAt: WINDOW.before }),
        battleRow({ arenaUniqueId: 1n, startedAt: later(1), accountId: STAT_SEED.mateId, team: 1, platoonSize: 2 }),
        battleRow({ arenaUniqueId: 1n, startedAt: later(1), accountId: HIDDEN_ID, team: 1, platoonSize: 2 }),
        battleRow({ arenaUniqueId: 3n, startedAt: later(3), accountId: STAT_SEED.mateId, team: 1, platoonSize: 2 })
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('sums random battles per map, tank and team', async () => {
    const rows = await mapStats({ db: prisma.$kysely, ...OWN });

    expect(sortBy(rows, (row) => row.arena_id)).toEqual([
      { arena_id: 'map_a', tank_id: 1, team: 1, battles: 2, wins: 1, damage: 1500, frags: 2, spotted: 2, cap: 0, def: 0, survived: 1 },
      { arena_id: 'map_b', tank_id: 2, team: 2, battles: 1, wins: 1, damage: 2000, frags: 1, spotted: 1, cap: 3, def: 4, survived: 1 }
    ]);
  });

  it('splits battles with a known platoon size into solo and platoon', async () => {
    const rows = await platoonSplit({ db: prisma.$kysely, ...OWN });

    expect(sortBy(rows, (row) => row.tank_id)).toEqual([
      { is_platoon: true, tank_id: 1, battles: 1, wins: 1, damage: 1000, frags: 1, spotted: 1, cap: 0, def: 0, survived: 1 },
      { is_platoon: false, tank_id: 2, battles: 1, wins: 1, damage: 2000, frags: 1, spotted: 1, cap: 3, def: 4, survived: 1 }
    ]);
  });

  it('sums own platoon battles per visible mate on the same team', async () => {
    const rows = await platoonMates({ db: prisma.$kysely, ...OWN });

    expect(rows).toEqual([
      { mate: Number(STAT_SEED.mateId), tank_id: 1, battles: 1, wins: 1, damage: 1000, frags: 1, spotted: 1, cap: 0, def: 0, survived: 1 }
    ]);
  });

  it('sums the other battles of the same tank and battle type as a reference', async () => {
    const battle = await prisma.battle.findFirstOrThrow({ where: { accountId: STAT_SEED.accountId, arenaUniqueId: 1n } });

    const row = await tankReference({
      db: prisma.$kysely,
      accountId: Number(battle.accountId),
      tankId: battle.tankId,
      battleType: battle.battleType,
      excludedBattleId: battle.id
    });

    expect(row).toEqual({ battles: 2, wins: 1, damage: 1500, assisted: 400, spotted: 2, frags: 2, blocked: 600 });
  });

  it('answers zeros when the tank has no other battle', async () => {
    const battle = await prisma.battle.findFirstOrThrow({ where: { accountId: STAT_SEED.accountId, arenaUniqueId: 3n } });

    const row = await tankReference({
      db: prisma.$kysely,
      accountId: Number(battle.accountId),
      tankId: battle.tankId,
      battleType: battle.battleType,
      excludedBattleId: battle.id
    });

    expect(row).toEqual({ battles: 0, wins: 0, damage: 0, assisted: 0, spotted: 0, frags: 0, blocked: 0 });
  });
});
