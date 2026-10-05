import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { activityByHour } from '../pulse.queries';

const WINDOW = {
  since: new Date('2026-09-01T00:00:00Z'),
  now: new Date('2026-10-01T00:00:00Z')
} as const;

const player = (accountId: number, lastBattleAt: string | null) => ({
  accountId: BigInt(accountId),
  nickname: `player${accountId}`,
  lastBattleAt: lastBattleAt === null ? null : new Date(lastBattleAt)
});

describeWithDatabase('activityByHour', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['player'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('counts players by their last battle per Moscow weekday and hour, Monday first', async () => {
    await prisma.player.createMany({
      data: [
        player(1, '2026-09-06T21:30:00Z'),
        player(2, '2026-09-06T21:10:00Z'),
        player(3, '2026-09-13T08:00:00Z'),
        player(4, '2026-08-31T23:59:00Z'),
        player(5, '2026-10-01T00:00:01Z'),
        player(6, null)
      ]
    });

    const rows = await activityByHour({ db: prisma.$kysely, ...WINDOW });

    expect(rows.toSorted((left, right) => left.weekday - right.weekday)).toEqual([
      { weekday: 0, hour: 0, players: 2 },
      { weekday: 6, hour: 11, players: 1 }
    ]);
  });
});
