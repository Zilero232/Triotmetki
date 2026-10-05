import { afterAll, beforeEach, expect, it } from 'vitest';

import { STAT_SEED, tankDeltaRow } from '../../../../core/prisma/_tests/stat-seeds';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { tankTrendRows } from '../tank-trend.queries';

const WINDOW = {
  from: new Date('2026-09-20T21:00:00Z'),
  recent: new Date('2026-10-01T21:00:00Z'),
  recentDay: '2026-10-02'
} as const;

describeWithDatabase('tank trend queries', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['tank_battle_delta'] });

    await prisma.tankBattleDelta.createMany({
      data: [
        tankDeltaRow({ capturedAt: new Date('2026-09-25T10:00:00Z'), battles: 2, wins: 1, damageDealt: 2000 }),
        tankDeltaRow({ capturedAt: new Date('2026-10-03T10:00:00Z'), battles: 3, wins: 2, damageDealt: 3000 }),
        tankDeltaRow({ capturedAt: new Date('2026-10-03T11:00:00Z'), accountId: STAT_SEED.mateId, battles: 1, wins: 1, damageDealt: 1000 }),
        tankDeltaRow({ capturedAt: new Date('2026-10-03T12:00:00Z'), mode: 'all', battles: 9 }),
        tankDeltaRow({ capturedAt: new Date('2026-10-03T12:00:00Z'), tankId: STAT_SEED.otherTankId, battles: 9 }),
        tankDeltaRow({ capturedAt: new Date('2026-09-10T10:00:00Z'), battles: 9 })
      ]
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reads daily server sums and counts players only for the recent days', async () => {
    const rows = await tankTrendRows({ db: prisma.$kysely, tankId: STAT_SEED.tankId, mode: 'random', ...WINDOW });

    expect(rows).toEqual([
      { day: '2026-09-25', battles: 2, wins: 1, damage: 2000, players: null },
      { day: '2026-10-03', battles: 4, wins: 3, damage: 4000, players: 2 }
    ]);
  });
});
