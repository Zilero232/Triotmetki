import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { TankEconomyReaderService } from '../tank-economy-reader.service';
import type { TankLearningReaderService } from '../tank-learning-reader.service';

import { AppNotFoundException } from '../../../../common/exceptions';
import { UserLestaAccountsService } from '../../../../core';
import { MyTankInsightsReaderService } from '../my-tank-insights-reader.service';

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const economy = mock<TankEconomyReaderService>();
  const learning = mock<TankLearningReaderService>();

  prisma.userLestaAccount.findFirst.mockResolvedValue(mock<UserLestaAccount>({ accountId: 42n }));

  return { service: new MyTankInsightsReaderService(new UserLestaAccountsService(prisma), economy, learning), prisma, economy, learning };
};

describe('MyTankInsightsReaderService.economyOf', () => {
  it('reports the economy of the primary linked account', async () => {
    const { service, economy } = createService();

    await service.economyOf({ userId: 'u1', query: { days: 14 } });

    expect(economy.account).toHaveBeenCalledWith({ accountId: 42n, days: 14 });
  });

  it('refuses a user without a linked account', async () => {
    const { service, prisma, economy } = createService();

    prisma.userLestaAccount.findFirst.mockResolvedValue(null);

    await expect(service.economyOf({ userId: 'u1', query: { days: 14 } })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(economy.account).not.toHaveBeenCalled();
  });
});

describe('MyTankInsightsReaderService.learningOf', () => {
  it('places the primary linked account on the tank curve', async () => {
    const { service, learning } = createService();

    await service.learningOf({ userId: 'u1', tankId: 5 });

    expect(learning.place).toHaveBeenCalledWith({ accountId: 42n, tankId: 5 });
  });

  it('refuses a user without a linked account', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findFirst.mockResolvedValue(null);

    await expect(service.learningOf({ userId: 'u1', tankId: 5 })).rejects.toBeInstanceOf(AppNotFoundException);
  });
});
