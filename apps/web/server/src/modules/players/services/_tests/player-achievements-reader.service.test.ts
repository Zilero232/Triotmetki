import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../core';
import type { LestaClient } from '../../../../lib/lesta';

import { PLAYER_ACHIEVEMENTS } from '../../config/player-lookup.constants';
import { PlayerAchievementsReaderService } from '../player-achievements-reader.service';

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const lesta = mockDeep<LestaClient>();

  prisma.achievement.findMany.mockResolvedValue([]);

  return { service: new PlayerAchievementsReaderService(prisma, lesta), lesta };
};

describe('PlayerAchievementsReaderService.achievements', () => {
  it('returns no items when Lesta has nothing for the account', async () => {
    const { service, lesta } = createService();

    lesta.account.achievements.mockResolvedValue({});

    await expect(service.achievements(42n)).resolves.toEqual({ items: [] });
  });

  it('lists the earned achievements of the requested account', async () => {
    const { service, lesta } = createService();

    lesta.account.achievements.mockResolvedValue({ '42': { achievements: { medalKay: 2, warrior: 0 }, max_series: null } });

    const { items } = await service.achievements(42n);

    expect(items.map((item) => item.name)).toEqual(['medalKay']);
  });
});

describe('PlayerAchievementsReaderService request', () => {
  it('asks Lesta only for the counts and series, not the medal progress', async () => {
    const { service, lesta } = createService();

    lesta.account.achievements.mockResolvedValue({});

    await service.achievements(42n);

    expect(lesta.account.achievements).toHaveBeenCalledWith({ accountIds: ['42'], fields: PLAYER_ACHIEVEMENTS.fields });
  });
});
