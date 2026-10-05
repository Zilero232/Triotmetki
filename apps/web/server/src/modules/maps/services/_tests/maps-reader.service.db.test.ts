import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { MapsReaderService } from '../maps-reader.service';
import { arena, battle, MAPS_SEED, replay } from './maps.fixtures';

const [first, second, third] = MAPS_SEED.accounts;
const receivedAt = (minute: number) => new Date(Date.UTC(2026, 9, 1, 10, minute));

describeWithDatabase('MapsReaderService.detail stats', () => {
  const prisma = createTestPrisma();
  const service = new MapsReaderService(prisma);

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'replay', 'player', 'arena'] });
    await prisma.player.createMany({ data: [first, second, third].map((accountId) => ({ accountId, nickname: `player-${accountId}` })) });
    await prisma.arena.createMany({ data: [arena(MAPS_SEED.arena, MAPS_SEED.slug), arena(MAPS_SEED.otherArena, MAPS_SEED.otherSlug)] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('counts each battle once from its first report and turns sides into team win rates', async () => {
    await prisma.battle.createMany({
      data: [
        battle({ accountId: first, arenaUniqueId: 100n, team: 1, result: 'win', receivedAt: receivedAt(0) }),
        battle({ accountId: second, arenaUniqueId: 100n, team: 2, result: 'draw', receivedAt: receivedAt(1) }),
        battle({ accountId: first, arenaUniqueId: 101n, team: 2, result: 'win', receivedAt: receivedAt(2) }),
        battle({ accountId: first, arenaUniqueId: 102n, team: 1, result: 'loss', receivedAt: receivedAt(3) }),
        battle({ accountId: first, arenaUniqueId: 103n, team: 1, result: 'draw', receivedAt: receivedAt(4) }),
        battle({ accountId: first, arenaUniqueId: 104n, team: null, result: 'win', receivedAt: receivedAt(5) }),
        battle({ accountId: first, arenaUniqueId: 105n, team: 1, result: 'win', arenaId: MAPS_SEED.otherArena, receivedAt: receivedAt(6) })
      ]
    });

    await prisma.replay.create({ data: replay({ sha256: 'ignored', arenaUniqueId: 900n, summary: { winnerTeam: 1 } }) });

    const { stats } = await service.detail(MAPS_SEED.slug);

    expect(stats).toEqual({
      source: 'battles',
      battles: 4,
      teams: [
        { team: 1, battles: 4, winRate: 25 },
        { team: 2, battles: 4, winRate: 50 }
      ]
    });
  });

  it('falls back to parsed replays, one per battle, when no battle has a side', async () => {
    await prisma.battle.create({ data: battle({ accountId: first, arenaUniqueId: 104n, team: null }) });

    await prisma.replay.createMany({
      data: [
        replay({ sha256: 'a', arenaUniqueId: 200n, summary: { winnerTeam: 1 } }),
        replay({ sha256: 'b', arenaUniqueId: 200n, summary: { winnerTeam: 1 } }),
        replay({ sha256: 'c', arenaUniqueId: null, summary: { winnerTeam: 2 } }),
        replay({ sha256: 'd', arenaUniqueId: null, summary: { winnerTeam: 2 } }),
        replay({ sha256: 'e', arenaUniqueId: 201n, summary: {} }),
        replay({ sha256: 'f', arenaUniqueId: 202n, summary: { winnerTeam: 1 }, status: 'uploaded' }),
        replay({ sha256: 'g', arenaUniqueId: 203n }),
        replay({ sha256: 'h', arenaUniqueId: 204n, summary: { winnerTeam: 1 }, arenaId: MAPS_SEED.otherArena })
      ]
    });

    const { stats } = await service.detail(MAPS_SEED.arena);

    expect(stats).toEqual({
      source: 'replays',
      battles: 4,
      teams: [
        { team: 1, battles: 4, winRate: 25 },
        { team: 2, battles: 4, winRate: 50 }
      ]
    });
  });

  it('reports no stats for a map nobody played', async () => {
    await prisma.battle.create({ data: battle({ accountId: first, arenaUniqueId: 100n, arenaId: MAPS_SEED.otherArena }) });

    const { stats } = await service.detail(MAPS_SEED.slug);

    expect(stats).toBeNull();
  });
});
