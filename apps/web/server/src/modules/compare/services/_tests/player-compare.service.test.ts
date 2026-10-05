import type { PlayerProfile } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PlayerTank } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { PlayerResolverService, PlayerSummaryReaderService } from '../../../players';

import { AppNotFoundException } from '../../../../common/exceptions';
import { PlayerCompareService } from '../player-compare.service';

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const resolver = mock<PlayerResolverService>();
  const summaries = mock<PlayerSummaryReaderService>();

  resolver.ensure.mockImplementation((accountId) => Promise.resolve(accountId));
  summaries.profile.mockResolvedValue(mock<PlayerProfile>());
  prisma.playerTank.findMany.mockResolvedValue([]);

  return { service: new PlayerCompareService(prisma, resolver, summaries), prisma, resolver, summaries };
};

describe('PlayerCompareService.compare', () => {
  it('returns a profile for every compared player', async () => {
    const { service } = createService();

    const { players } = await service.compare({ accountIds: [1, 2, 3] });

    expect(players).toHaveLength(3);
  });

  it('keeps only tanks every player has played', async () => {
    const { service, prisma } = createService();

    prisma.playerTank.findMany.mockResolvedValue([
      mock<PlayerTank>({ accountId: 1n, tankId: 10 }),
      mock<PlayerTank>({ accountId: 2n, tankId: 10 }),
      mock<PlayerTank>({ accountId: 1n, tankId: 20 })
    ]);

    const { commonTankIds } = await service.compare({ accountIds: [1, 2] });

    expect(commonTankIds).toEqual([10]);
  });

  it('fails when one of the players cannot be resolved', async () => {
    const { service, resolver, summaries } = createService();

    resolver.ensure.mockRejectedValueOnce(new AppNotFoundException('PLAYER_NOT_FOUND', 'missing'));

    await expect(service.compare({ accountIds: [1, 2] })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(summaries.profile).not.toHaveBeenCalled();
  });
});
