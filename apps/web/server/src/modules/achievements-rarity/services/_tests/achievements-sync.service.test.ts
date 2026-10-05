import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { LestaClients } from '../../../../core';
import type { PurgeGuardService } from '../../../collector';
import type { AchievementsSyncQueries, FetchCandidateRow } from '../../queries/achievements-sync.types';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { AchievementsSyncService } from '../achievements-sync.service';

type LestaAchievements = Awaited<ReturnType<LestaClients['bulk']['account']['achievements']>>;

type Setup = {
  candidates: FetchCandidateRow[];
  response: LestaAchievements;
  blocked?: number[];
};

const setup = ({ candidates, response, blocked = [] }: Setup) => {
  const prisma = mockPrismaService();
  const clients = mockDeep<LestaClients>();
  const guard = mock<PurgeGuardService>();
  const queries = mock<AchievementsSyncQueries>();

  guard.blocked.mockResolvedValue(new Set(blocked));

  queries.fetchCandidates.mockResolvedValue(candidates);
  clients.bulk.account.achievements.mockResolvedValue(response);
  prisma.$transaction.mockResolvedValue([]);

  return { clients, sync: new AchievementsSyncService(prisma, clients, guard, queries) };
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

  it('skips an account whose deletion request opened while Lesta was answering', async () => {
    const { sync } = setup({
      candidates: [{ accountId: 1 }, { accountId: 2 }],
      response: { 1: { achievements: { warrior: 1 } }, 2: { achievements: { warrior: 2 } } },
      blocked: [2]
    });

    const result = await sync.fetch();

    expect(result).toEqual({ requested: 2, stored: 1 });
  });
});
