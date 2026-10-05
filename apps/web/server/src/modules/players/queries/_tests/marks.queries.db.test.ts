import { range, sortBy } from 'remeda';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { battleRow, STAT_SEED } from '../../../../core/prisma/_tests/stat-seeds';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { PLAYER_MARKS } from '../../config';
import { combinedDamage } from '../player-marks.queries';

const START = new Date('2026-10-01T10:00:00Z');

const at = (minutes: number) => new Date(START.getTime() + minutes * 60_000);

const NO_ASSIST = { damageAssistedRadio: 0, damageAssistedTrack: 0, damageAssistedStun: 0 } as const;

describeWithDatabase('marks queries', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'player'] });

    await prisma.player.createMany({
      data: [
        { accountId: STAT_SEED.accountId, nickname: 'owner' },
        { accountId: STAT_SEED.mateId, nickname: 'other' }
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('averages damage plus the largest assist per tank', async () => {
    await prisma.battle.createMany({
      data: [
        battleRow({ arenaUniqueId: 1n, startedAt: at(1), damageDealt: 1000 }),
        battleRow({ arenaUniqueId: 2n, startedAt: at(2), damageDealt: 2000, damageAssistedRadio: 500 }),
        battleRow({ arenaUniqueId: 3n, startedAt: at(3), tankId: STAT_SEED.otherTankId, damageDealt: 300 }),
        battleRow({ arenaUniqueId: 4n, startedAt: at(4), accountId: STAT_SEED.mateId, damageDealt: 9000 })
      ]
    });

    const rows = await combinedDamage({ db: prisma.$kysely, accountId: Number(STAT_SEED.accountId) });

    expect(sortBy(rows, (row) => row.tank_id)).toEqual([
      { tank_id: 1, battles: 2, combined: 1850 },
      { tank_id: 2, battles: 1, combined: 500 }
    ]);
  });

  it('keeps only the latest battles of a tank', async () => {
    const recent = range(0, PLAYER_MARKS.combinedDamageBattles).map((index) =>
      battleRow({ arenaUniqueId: BigInt(100 + index), startedAt: at(10 + index), damageDealt: 0, ...NO_ASSIST })
    );

    await prisma.battle.createMany({ data: [battleRow({ arenaUniqueId: 99n, startedAt: at(0), damageDealt: 10_000 }), ...recent] });

    const rows = await combinedDamage({ db: prisma.$kysely, accountId: Number(STAT_SEED.accountId) });

    expect(rows).toEqual([{ tank_id: 1, battles: PLAYER_MARKS.combinedDamageBattles, combined: 0 }]);
  });
});
