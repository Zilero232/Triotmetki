import { subDays } from 'date-fns';
import { sortBy } from 'remeda';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../../core/prisma/_tests/test-database';
import { battleSeed, playerSeed } from '../../../_tests/aggregates.seeds';
import { buildRanks } from '../build-usage.queries';

const ACCOUNTS = [1_000_000_901n, 1_000_000_902n, 1_000_000_903n, 1_000_000_904n, 1_000_000_905n, 1_000_000_906n] as const;
const [FIRST, SECOND, UNPLAYED, FEW_BATTLES, UNRATED, NOT_RATED_AT_ALL] = ACCOUNTS;
const LOADOUT = { optionalDevices: [1] };

const rating = ({ accountId, tankId = 1, wn8, battles = 100 }: { accountId: bigint; tankId?: number; wn8: number | null; battles?: number }) => ({
  accountId,
  tankId,
  period: 'overall' as const,
  battles,
  winRate: 50,
  avgDamage: 1000,
  avgFrags: 1,
  avgXp: 500,
  wn8
});

describeWithDatabase('build usage queries', () => {
  const prisma = createTestPrisma();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['account_tank_rating', 'battle', 'player'] });
    await prisma.player.createMany({ data: ACCOUNTS.map((accountId) => playerSeed(accountId)) });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('buildRanks', () => {
    it('ranks the accounts that played a tank with a loadout by overall WN8 among every rated player of that tank', async () => {
      const since = subDays(new Date(), 30);
      const recently = subDays(new Date(), 1);

      await prisma.accountTankRating.createMany({
        data: [
          rating({ accountId: FIRST, wn8: 3000 }),
          rating({ accountId: SECOND, wn8: 2000 }),
          rating({ accountId: UNPLAYED, wn8: 1000 }),
          rating({ accountId: FEW_BATTLES, wn8: 5000, battles: 29 }),
          rating({ accountId: UNRATED, wn8: null }),
          rating({ accountId: FIRST, tankId: 2, wn8: 1000 }),
          { ...rating({ accountId: SECOND, wn8: 9000 }), period: 'd7' as const }
        ]
      });

      await prisma.battle.createMany({
        data: [
          battleSeed({ accountId: FIRST, tankId: 1, arenaUniqueId: 1n, startedAt: recently, loadout: LOADOUT }),
          battleSeed({ accountId: FIRST, tankId: 1, arenaUniqueId: 2n, startedAt: recently, loadout: LOADOUT }),
          battleSeed({ accountId: SECOND, tankId: 1, arenaUniqueId: 3n, startedAt: recently, battleType: '22', loadout: LOADOUT }),
          battleSeed({ accountId: FEW_BATTLES, tankId: 1, arenaUniqueId: 4n, startedAt: recently, loadout: LOADOUT }),
          battleSeed({ accountId: UNRATED, tankId: 1, arenaUniqueId: 5n, startedAt: recently, loadout: LOADOUT }),
          battleSeed({ accountId: NOT_RATED_AT_ALL, tankId: 1, arenaUniqueId: 6n, startedAt: recently, loadout: LOADOUT }),
          battleSeed({ accountId: UNPLAYED, tankId: 1, arenaUniqueId: 7n, startedAt: recently }),
          battleSeed({ accountId: UNPLAYED, tankId: 1, arenaUniqueId: 8n, startedAt: recently, battleType: '13', loadout: LOADOUT }),
          battleSeed({ accountId: FIRST, tankId: 2, arenaUniqueId: 9n, startedAt: subDays(new Date(), 31), loadout: LOADOUT })
        ]
      });

      const rows = await buildRanks({ db: prisma.$kysely, since, battleTypes: ['1', '22'] });

      expect(
        sortBy(
          rows.map((row) => ({ tankId: row.tank_id, accountId: String(row.account_id), rank: row.rank })),
          (row) => row.accountId
        )
      ).toEqual([
        { tankId: 1, accountId: String(FIRST), rank: 0 },
        { tankId: 1, accountId: String(SECOND), rank: 0.5 }
      ]);
    });
  });
});
