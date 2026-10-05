import { sortBy } from 'remeda';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../../core/prisma/_tests/test-database';
import { playerSeed, tankBattleDeltaSeed } from '../../../_tests/aggregates.seeds';
import { serverPlayers } from '../server-stats.queries';

const ACCOUNTS = [1_000_001_001n, 1_000_001_002n, 1_000_001_003n] as const;
const [FIRST, SECOND, THIRD] = ACCOUNTS;
const at = (iso: string) => new Date(iso);

describeWithDatabase('server stats queries', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['tank_battle_delta', 'player'] });
    await prisma.player.createMany({ data: ACCOUNTS.map((accountId) => playerSeed(accountId)) });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('serverPlayers', () => {
    it('counts distinct players per tank and cohort, and per tank across cohorts, for each period start', async () => {
      await prisma.tankBattleDelta.createMany({
        data: [
          tankBattleDeltaSeed({ accountId: FIRST, tankId: 1, capturedAt: at('2026-10-04T10:00:00Z'), battles: 1 }),
          tankBattleDeltaSeed({ accountId: FIRST, tankId: 1, capturedAt: at('2026-10-01T10:00:00Z'), battles: 1 }),
          tankBattleDeltaSeed({ accountId: SECOND, tankId: 1, capturedAt: at('2026-10-01T10:00:00Z'), cohort: 'good', battles: 1 }),
          tankBattleDeltaSeed({ accountId: THIRD, tankId: 1, capturedAt: at('2026-09-20T10:00:00Z'), battles: 1 }),
          tankBattleDeltaSeed({ accountId: THIRD, tankId: 2, capturedAt: at('2026-10-04T12:00:00Z'), battles: 1 }),
          tankBattleDeltaSeed({ accountId: SECOND, tankId: 2, capturedAt: at('2026-10-05T01:00:00Z'), battles: 1 }),
          tankBattleDeltaSeed({ accountId: SECOND, tankId: 2, capturedAt: at('2026-09-01T01:00:00Z'), battles: 1 }),
          tankBattleDeltaSeed({ accountId: FIRST, tankId: 3, capturedAt: at('2026-10-04T10:00:00Z'), mode: 'all', battles: 1 })
        ]
      });

      const rows = await serverPlayers({
        db: prisma.$kysely,
        mode: 'random',
        sinces: [at('2026-10-04T00:00:00Z'), at('2026-09-28T00:00:00Z'), at('2026-09-15T00:00:00Z')],
        until: at('2026-10-05T00:00:00Z')
      });

      expect(
        sortBy(
          rows,
          (row) => row.tankId,
          (row) => row.cohort
        )
      ).toEqual([
        { tankId: 1, cohort: 'all', players: [1, 2, 3] },
        { tankId: 1, cohort: 'average', players: [1, 1, 2] },
        { tankId: 1, cohort: 'good', players: [0, 1, 1] },
        { tankId: 2, cohort: 'all', players: [1, 1, 1] },
        { tankId: 2, cohort: 'average', players: [1, 1, 1] }
      ]);
    });
  });
});
