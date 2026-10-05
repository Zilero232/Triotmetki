import type { LeaderboardQuery } from '@otmetki/schemas';

import { leaderboardQuerySchema } from '@otmetki/schemas';
import { describe, expect, it, vi } from 'vitest';

import type { LeaderboardQueries, RankedRow } from '../../queries/leaderboard.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { LEADERBOARD_MIN_BATTLES } from '../../config/min-battles.constants';
import { RISING_STARS } from '../../config/rising-stars.constants';
import { LeaderboardService } from '../leaderboard.service';

const query = (overrides: Partial<LeaderboardQuery>): LeaderboardQuery => ({ ...leaderboardQuerySchema.parse({}), ...overrides });

const createService = (rows: RankedRow[] = [], total = rows.length) => {
  const board = vi.fn().mockResolvedValue({ rows, total });

  const queries: LeaderboardQueries = {
    playersBoard: board,
    tankPlayersBoard: board,
    clansBoard: board,
    risingStarsBoard: board,
    marksBoard: board
  };

  return new LeaderboardService(mockPrismaService(), queries);
};

describe('LeaderboardService.leaderboard', () => {
  it('reports the battles threshold it applied to players', async () => {
    const board = await createService().leaderboard(query({ scope: 'players', period: '7d' }));

    expect(board.minBattles).toBe(LEADERBOARD_MIN_BATTLES['7d']);
  });

  it('reports an explicit threshold as given', async () => {
    const board = await createService().leaderboard(query({ scope: 'players', minBattles: 3 }));

    expect(board.minBattles).toBe(3);
  });

  it('reports no threshold for clans', async () => {
    const board = await createService().leaderboard(query({ scope: 'clans' }));

    expect(board.minBattles).toBeNull();
  });

  it('reports no threshold for marks', async () => {
    const board = await createService().leaderboard(query({ scope: 'marks' }));

    expect(board.minBattles).toBeNull();
  });

  it('uses the fallback period of rising stars for the overall period', async () => {
    const board = await createService().leaderboard(query({ scope: 'risingStars', period: 'overall' }));

    expect(board.minBattles).toBe(LEADERBOARD_MIN_BATTLES[RISING_STARS.fallbackPeriod]);
  });

  it('passes the clan colour through', async () => {
    const board = await createService([
      { accountId: null, clanId: 10, name: 'Три отметки', clanTag: 'BRNVK', color: '#ff0000', value: 1_800, battles: 10, delta: null }
    ]).leaderboard(query({ scope: 'clans' }));

    expect(board.entries[0]?.color).toBe('#ff0000');
  });

  it('ranks the page from the offset', async () => {
    const row = { accountId: 1, clanId: null, name: 'Tanker', clanTag: null, color: null, value: 2_000, battles: 1_500, delta: null };

    const board = await createService([row]).leaderboard(query({ scope: 'players', offset: 40 }));

    expect(board.entries[0]?.rank).toBe(41);
  });

  it('reports the total of the whole ranking, not the size of the page', async () => {
    const row = { accountId: 1, clanId: null, name: 'Tanker', clanTag: null, color: null, value: 2_000, battles: 1_500, delta: null };

    const board = await createService([row], 1_234).leaderboard(query({ scope: 'players', limit: 1 }));

    expect(board.total).toBe(1_234);
  });
});
