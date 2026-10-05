import { PROGRESSION_REWARDS, tankLevelOf } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PlayerTank, TankChallengeProgress, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { weekWindow } from '../../../../common/lib';
import { UserAccountsReaderService } from '../../../accounts';
import { EntitlementsService } from '../../../billing';
import { TankProgressReaderService } from '../tank-progress-reader.service';

const now = new Date('2026-09-26T10:00:00Z');
const { weekStart: start } = weekWindow(now);

const challenge = (fields: Partial<TankChallengeProgress>): TankChallengeProgress => ({
  accountId: 7n,
  tankId: 1,
  weekStart: start,
  code: 'wins',
  metric: 'wins',
  threshold: null,
  target: 5,
  progress: 0,
  completedAt: null,
  updatedAt: now,
  ...fields
});

const setup = () => {
  const prisma = mockDeep<PrismaService>();
  const entitlements = mock<EntitlementsService>();

  entitlements.isPlus.mockResolvedValue(true);
  prisma.userLestaAccount.findMany.mockResolvedValue([Object.assign(mock<UserLestaAccount>(), { accountId: 7n })]);
  prisma.playerTank.findMany.mockResolvedValue([]);
  prisma.tankChallengeProgress.findMany.mockResolvedValue([]);

  return { prisma, entitlements, service: new TankProgressReaderService(prisma, entitlements, new UserAccountsReaderService(prisma)) };
};

describe('TankProgressReaderService.list', () => {
  it('derives each tank level window from its XP', async () => {
    const { prisma, service } = setup();
    const xp = 1_000;

    prisma.playerTank.findMany.mockResolvedValue([
      Object.assign(mock<PlayerTank>(), { accountId: 7n, tankId: 1, progressXp: xp, progressBattles: 12, updatedAt: now })
    ]);

    const [item] = (await service.list('u')).items;

    expect(item).toMatchObject({ accountId: 7, tankId: 1, ...tankLevelOf(xp), battles: 12 });
    expect(item?.xp).toBeGreaterThanOrEqual(item?.levelXp ?? Number.POSITIVE_INFINITY);
  });

  it('lists only the tanks that have earned progression XP', async () => {
    const { prisma, service } = setup();

    await service.list('u');

    expect(prisma.playerTank.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: { in: [7n] }, progressXp: { gt: 0 } } }));
  });

  it('reports whether XP is accruing from the Plus status', async () => {
    const { entitlements, service } = setup();

    entitlements.isPlus.mockResolvedValue(false);

    expect(await service.list('u')).toEqual({ isAccruing: false, items: [] });
  });
});

describe('TankProgressReaderService.challenges', () => {
  it('returns the current week window without challenges', async () => {
    const { service } = setup();

    const result = await service.challenges({ userId: 'u', now });

    expect(result.sets).toEqual([]);
    expect(new Date(result.endsAt).getTime()).toBeGreaterThan(now.getTime());
    expect(result.weekStart).toBe(start.toISOString().slice(0, 10));
  });

  it('groups challenges per tank and caps progress at the target', async () => {
    const { prisma, service } = setup();

    prisma.tankChallengeProgress.findMany.mockResolvedValue([
      challenge({ code: 'wins', progress: 9, target: 5, completedAt: now }),
      challenge({ code: 'frags', metric: 'frags', progress: 2, target: 10 }),
      challenge({ tankId: 2, code: 'wins', progress: 1 })
    ]);

    const { sets } = await service.challenges({ userId: 'u', now });
    const first = sets.find((set) => set.tankId === 1);

    expect(sets).toHaveLength(2);

    expect(first?.items.find((item) => item.code === 'wins')).toMatchObject({
      progress: 5,
      completedAt: now.toISOString(),
      shells: PROGRESSION_REWARDS.challengeShells
    });
  });

  it('puts tanks with more open challenges first', async () => {
    const { prisma, service } = setup();

    prisma.tankChallengeProgress.findMany.mockResolvedValue([
      challenge({ tankId: 1, code: 'wins', completedAt: now }),
      challenge({ tankId: 2, code: 'wins' }),
      challenge({ tankId: 2, code: 'frags', metric: 'frags' })
    ]);

    const { sets } = await service.challenges({ userId: 'u', now });

    expect(sets.map((set) => set.tankId)).toEqual([2, 1]);
  });

  it('drops rows with a metric the schema no longer knows', async () => {
    const { prisma, service } = setup();

    prisma.tankChallengeProgress.findMany.mockResolvedValue([challenge({ code: 'old', metric: 'retired' })]);

    const { sets } = await service.challenges({ userId: 'u', now });

    expect(sets[0]?.items).toEqual([]);
  });
});
