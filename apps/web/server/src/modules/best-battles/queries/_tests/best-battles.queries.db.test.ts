import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { BEST_BATTLES } from '../../config/feed.constants';
import { bestBattlesQueries } from '../best-battles.queries';
import { BB, BB_TABLES, seedBestBattles } from './best-battles.fixtures';

const WEEK = { since: new Date('2026-09-28T12:00:00Z'), battleTypes: BEST_BATTLES.battleTypes } as const;

describeWithDatabase('best battles queries', () => {
  const prisma = createTestPrisma();

  beforeAll(async () => {
    await truncateTables({ prisma, tables: [...BB_TABLES] });
    await seedBestBattles(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('modFeedPage', () => {
    it('takes the top corroborated mod battles with numeric ids and the earliest public replay', async () => {
      const rows = await bestBattlesQueries.modFeedPage({ db: prisma.$kysely, ...WEEK, tankIds: null, metric: 'damage', take: 2 });

      expect(
        rows.map(({ source, account_id, arena_unique_id, damage, assisted, map_name, replay_id }) => ({
          source,
          account_id,
          arena_unique_id,
          damage,
          assisted,
          map_name,
          replay_id
        }))
      ).toEqual([
        { source: 'mod', account_id: 1, arena_unique_id: 101, damage: 5000, assisted: 350, map_name: null, replay_id: BB.replays.r1 },
        { source: 'mod', account_id: 2, arena_unique_id: 102, damage: 4000, assisted: 350, map_name: null, replay_id: null }
      ]);
    });
  });

  describe('replayFeedPage', () => {
    it('takes the top owner-uploaded replays, each its own replay', async () => {
      const rows = await bestBattlesQueries.replayFeedPage({ db: prisma.$kysely, ...WEEK, tankIds: null, metric: 'damage', take: 2 });

      expect(rows.map(({ source, battle_id, replay_id, spotted, blocked }) => ({ source, battle_id, replay_id, spotted, blocked }))).toEqual([
        { source: 'replay', battle_id: BB.replays.r2, replay_id: BB.replays.r2, spotted: 3, blocked: 450 },
        { source: 'replay', battle_id: BB.replays.r3, replay_id: BB.replays.r3, spotted: null, blocked: null }
      ]);
    });
  });

  describe('facetCounts', () => {
    it('limits each facet list but counts every battle', async () => {
      const counts = await bestBattlesQueries.facetCounts({ db: prisma.$kysely, ...WEEK, take: { medals: 1, tanks: 1, arenas: 1 } });

      expect(counts).toEqual({
        battles: 9,
        top_damage: 9000,
        medals: [{ key: 'medalKay', battles: 2 }],
        tanks: [{ tank_id: 12, battles: 5 }],
        arenas: [{ arena_id: 'map_b', battles: 4 }]
      });
    });
  });
});
