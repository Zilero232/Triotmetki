import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { LestaClients } from '../../../../core';
import type { AchievementsSyncQueries, FetchCandidateRow } from '../../queries/achievements-sync.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { AchievementsSyncService } from '../achievements-sync.service';

type LestaAchievements = Awaited<ReturnType<LestaClients['bulk']['account']['achievements']>>;

type Setup = {
  candidates: FetchCandidateRow[];
  response: LestaAchievements;
};

const setup = ({ candidates, response }: Setup) => {
  const prisma = mockPrismaService();
  const clients = mockDeep<LestaClients>();
  const queries = mock<AchievementsSyncQueries>();

  queries.fetchCandidates.mockResolvedValue(candidates);
  clients.bulk.account.achievements.mockResolvedValue(response);
  prisma.$transaction.mockResolvedValue([]);

  return { clients, sync: new AchievementsSyncService(prisma, clients, queries) };
};

describe('AchievementsSyncService.fetch', () => {
  it('does nothing without due accounts', async () => {
    const { sync, clients } = setup({ candidates: [], response: {} });

    const result = await sync.fetch();

    expect(result).toEqual({ requested: 0, stored: 0 });
    expect(clients.bulk.account.achievements).not.toHaveBeenCalled();
  });

  it('counts only the accounts Lesta answered for as stored', async () => {
    const { sync } = setup({
      candidates: [{ accountId: 1 }, { accountId: 2 }, { accountId: 3 }],
      response: { 1: { achievements: { warrior: 1 } }, 2: null }
    });

    const result = await sync.fetch();

    expect(result).toEqual({ requested: 3, stored: 1 });
  });
});
