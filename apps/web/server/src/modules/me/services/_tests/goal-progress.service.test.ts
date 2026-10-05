import { addDays, subDays } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Goal, PlayerTank } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { NotificationService } from '../../../notifications';
import type { ExpectedValuesReaderService } from '../../../reference';

import { GoalProgressService } from '../goal-progress.service';

type GoalGroup = Awaited<ReturnType<PrismaService['goal']['groupBy']>>[number];

type BattleGroup = Awaited<ReturnType<PrismaService['battle']['groupBy']>>[number];

const NOW = new Date('2026-09-28T12:00:00.000Z');

const goalRow = (overrides: Partial<Goal> = {}): Goal => ({
  id: 'goal',
  userId: 'user',
  accountId: 7n,
  metric: 'battles',
  tankId: null,
  target: 10,
  baseline: 0,
  current: 0,
  status: 'active',
  startsAt: subDays(NOW, 3),
  endsAt: addDays(NOW, 4),
  achievedAt: null,
  createdAt: subDays(NOW, 3),
  ...overrides
});

const sums = { damageDealt: 3000, frags: 1, spotted: 1, capturePoints: 0, droppedCapturePoints: 0 };

const createService = (goals: Goal[]) => {
  const prisma = mockDeep<PrismaService>();
  const expected = mock<ExpectedValuesReaderService>();
  const notifications = mock<NotificationService>();

  vi.mocked(prisma.goal.groupBy).mockResolvedValue([mock<GoalGroup>({ accountId: 7n })]);
  vi.mocked(prisma.battle.groupBy).mockResolvedValue([]);
  vi.mocked(prisma.tankBattleDelta.groupBy).mockResolvedValue([]);
  prisma.goal.findMany.mockResolvedValue(goals);
  prisma.goal.updateMany.mockResolvedValue({ count: 1 });
  expected.all.mockResolvedValue(new Map());

  return { service: new GoalProgressService(prisma, expected, notifications), prisma, expected, notifications };
};

const battleGroups = (prisma: ReturnType<typeof createService>['prisma'], rows: Array<{ result: 'loss' | 'win'; battles: number }>) => {
  vi.mocked(prisma.battle.groupBy)
    .mockResolvedValueOnce([mock<BattleGroup>({ accountId: 7n })])
    .mockResolvedValueOnce(rows.map(({ result, battles }) => mock<BattleGroup>({ tankId: 1, result, _count: { _all: battles }, _sum: sums })));
};

describe('GoalProgressService.run', () => {
  it('looks only at active goals of accounts with fresh battles or goals past their end', async () => {
    const { service, prisma } = createService([]);

    await service.run(NOW);

    expect(vi.mocked(prisma.battle.groupBy).mock.calls[0]?.[0].where).toMatchObject({ accountId: { in: [7n] } });

    expect(prisma.goal.findMany.mock.calls[0]?.[0]?.where).toEqual({
      status: 'active',
      OR: [{ endsAt: { lte: NOW } }, { accountId: { in: [] } }]
    });
  });

  it('updates the battles count and completes the goal once it is reached, notifying the owner', async () => {
    const { service, prisma, notifications } = createService([goalRow()]);

    battleGroups(prisma, [
      { result: 'win', battles: 6 },
      { result: 'loss', battles: 4 }
    ]);

    await expect(service.run(NOW)).resolves.toBe(1);

    expect(prisma.goal.updateMany).toHaveBeenCalledWith({
      where: { id: 'goal', status: 'active' },
      data: { current: 10, status: 'achieved', achievedAt: NOW }
    });

    expect(notifications.notify).toHaveBeenCalledWith({
      userId: 'user',
      notification: { event: 'goalReached', goalId: 'goal', metric: 'battles', target: 10 },
      dedupeKey: 'goal-goal'
    });
  });

  it('keeps an average goal active while its window runs', async () => {
    const { service, prisma, notifications } = createService([goalRow({ metric: 'avgDamage', target: 2000, current: 1500 })]);

    battleGroups(prisma, [{ result: 'win', battles: 1 }]);

    await service.run(NOW);

    expect(prisma.goal.updateMany.mock.calls[0]?.[0].data).toEqual({ current: 3000 });
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('fails a goal whose window ended below the target', async () => {
    const { service, prisma, notifications } = createService([goalRow({ current: 3, endsAt: subDays(NOW, 1) })]);

    await service.run(NOW);

    expect(prisma.goal.updateMany.mock.calls[0]?.[0].data).toEqual({ current: 3, status: 'failed' });
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('reads the tank MoE for a MoE goal and skips an unchanged goal', async () => {
    const { service, prisma } = createService([goalRow({ metric: 'moe', tankId: 1, target: 85, current: 80 })]);

    prisma.playerTank.findUnique.mockResolvedValue(mock<PlayerTank>({ moePercent: 80 }));

    await expect(service.run(NOW)).resolves.toBe(0);
    expect(prisma.goal.updateMany).not.toHaveBeenCalled();
  });

  it('does not notify when the goal was cancelled meanwhile', async () => {
    const { service, prisma, notifications } = createService([goalRow()]);

    battleGroups(prisma, [{ result: 'win', battles: 12 }]);
    prisma.goal.updateMany.mockResolvedValue({ count: 0 });

    await service.run(NOW);

    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('settles the other due goals when one of them cannot be evaluated', async () => {
    const { service, prisma, notifications } = createService([goalRow({ id: 'broken', metric: 'moe', tankId: 1 }), goalRow({ id: 'healthy' })]);

    battleGroups(prisma, [{ result: 'win', battles: 10 }]);
    prisma.playerTank.findUnique.mockRejectedValue(new Error('connection reset'));

    await expect(service.run(NOW)).resolves.toBe(1);
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ notification: expect.objectContaining({ goalId: 'healthy' }) }));
  });

  it('fails the run when no due goal could be evaluated, so the job reports it', async () => {
    const { service, prisma } = createService([goalRow({ metric: 'moe', tankId: 1 })]);

    prisma.playerTank.findUnique.mockRejectedValue(new Error('connection reset'));

    await expect(service.run(NOW)).rejects.toThrow(/none of 1/u);
  });

  it('loads WN8 expected values only when a WN8 goal is due', async () => {
    const { service, expected } = createService([goalRow()]);

    await service.run(NOW);

    expect(expected.all).not.toHaveBeenCalled();
  });
});
