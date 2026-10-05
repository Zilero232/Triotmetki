import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { arena, MAPS_SEED, replay } from '../../services/_tests/maps.fixtures';
import { teamStatsQueries } from '../team-stats.queries';

describeWithDatabase('teamStatsQueries.replayWinners on a database', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['replay', 'arena'] });
    await prisma.arena.create({ data: arena(MAPS_SEED.arena, MAPS_SEED.slug) });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('reads a winner stored as a number or as a digit string', async () => {
    await prisma.replay.createMany({
      data: [
        replay({ sha256: 'a', arenaUniqueId: 1n, summary: { winnerTeam: 1 } }),
        replay({ sha256: 'b', arenaUniqueId: 2n, summary: { winnerTeam: '2' } })
      ]
    });

    const rows = await teamStatsQueries.replayWinners({ db: prisma.$kysely, arenaId: MAPS_SEED.arena });

    expect(rows.toSorted((left, right) => (left.winner ?? 0) - (right.winner ?? 0))).toEqual([
      { winner: 1, battles: 1 },
      { winner: 2, battles: 1 }
    ]);
  });

  it('treats a winner that is not a whole number as unknown instead of failing the query', async () => {
    await prisma.replay.createMany({
      data: [
        replay({ sha256: 'a', arenaUniqueId: 1n, summary: { winnerTeam: 1 } }),
        replay({ sha256: 'b', arenaUniqueId: 2n, summary: { winnerTeam: 'draw' } }),
        replay({ sha256: 'c', arenaUniqueId: 3n, summary: { winnerTeam: 1.5 } }),
        replay({ sha256: 'd', arenaUniqueId: 4n, summary: { winnerTeam: '99999999999999' } })
      ]
    });

    const rows = await teamStatsQueries.replayWinners({ db: prisma.$kysely, arenaId: MAPS_SEED.arena });

    expect(rows.toSorted((left, right) => (left.winner ?? 0) - (right.winner ?? 0))).toEqual([
      { winner: null, battles: 3 },
      { winner: 1, battles: 1 }
    ]);
  });
});
