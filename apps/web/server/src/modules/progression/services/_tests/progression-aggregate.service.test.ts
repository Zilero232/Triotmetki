import { PROGRESSION_REWARDS, TANK_LEVELS, tankLevelOf } from '@otmetki/schemas';
import { range } from 'remeda';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Battle, Player, PlayerTank, Subscription, TankChallengeProgress, UserLestaAccount, Vehicle } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { NotificationService } from '../../../notifications';

import { weekWindow } from '../../../../common/lib';
import { PROGRESSION_RUN } from '../../config/queue.constants';
import { TANK_CHALLENGE_POOL } from '../../config/tank-challenges.constants';
import { ProgressionAggregateService } from '../progression-aggregate.service';
import { SeasonRewardsWriterService } from '../season-rewards-writer.service';
import { ShellLedgerWriterService } from '../shell-ledger-writer.service';

const now = new Date('2026-09-26T10:00:00Z');
const tankId = 1;

const link = (userId: string, accountId: bigint) => Object.assign(mock<UserLestaAccount>(), { userId, accountId });

const modBattle = (fields: Partial<Battle> = {}) =>
  Object.assign(mock<Battle>(), {
    tankId,
    result: 'win',
    damageDealt: 10_000,
    spotted: 5,
    frags: 5,
    damageBlocked: 10_000,
    survived: true,
    moePercentDelta: 1,
    ...fields
  });

const progress = (fields: Pick<PlayerTank, 'progressLevel' | 'progressXp'>) => Object.assign(mock<PlayerTank>(), { tankId, ...fields });

const cursor = (progressionProcessedUntil: Date) => Object.assign(mock<Player>(), { progressionProcessedUntil });

const setup = () => {
  const prisma = mockDeep<PrismaService>();
  const ledger = mock<ShellLedgerWriterService>();
  const seasons = mock<SeasonRewardsWriterService>();
  const notifications = mock<NotificationService>();

  prisma.subscription.findMany.mockResolvedValue([Object.assign(mock<Subscription>(), { userId: 'u' })]);
  prisma.userLestaAccount.findMany.mockResolvedValue([link('u', 7n)]);
  prisma.player.findUnique.mockResolvedValue(null);
  prisma.tankBattleDelta.findMany.mockResolvedValue([]);
  prisma.battle.findMany.mockResolvedValue([]);
  prisma.battle.findFirst.mockResolvedValue(null);
  prisma.vehicle.findMany.mockResolvedValue([Object.assign(mock<Vehicle>(), { tankId, tier: 8, name: 'Object 140', shortName: 'Об. 140' })]);
  prisma.playerTank.findMany.mockResolvedValue([]);
  prisma.tankChallengeProgress.findMany.mockResolvedValue([]);
  ledger.grant.mockResolvedValue(true);
  seasons.claimRewards.mockResolvedValue(0);

  return { prisma, ledger, seasons, notifications, service: new ProgressionAggregateService(prisma, ledger, seasons, notifications) };
};

const grantsFor = (ledger: ReturnType<typeof setup>['ledger'], reason: string) =>
  ledger.grant.mock.calls.map(([input]) => input).filter((input) => input.reason === reason);

describe('ProgressionAggregateService.run', () => {
  it('adds no XP and grants nothing when no battles arrived since the cursor', async () => {
    const { prisma, ledger, service } = setup();

    prisma.player.findUnique.mockResolvedValue(cursor(now));
    prisma.playerTank.findMany.mockResolvedValue([progress({ progressXp: 500, progressLevel: 3 })]);

    expect(await service.run(now)).toBe(1);
    expect(prisma.playerTank.upsert).not.toHaveBeenCalled();
    expect(ledger.grant).not.toHaveBeenCalled();
  });

  it('reads battles only after the stored cursor, or from the week start on the first run', async () => {
    const cursorAt = new Date('2026-09-26T09:40:00Z');
    const first = setup();
    const next = setup();

    next.prisma.player.findUnique.mockResolvedValue(cursor(cursorAt));

    await first.service.run(now);
    await next.service.run(now);

    expect(first.prisma.battle.findMany.mock.calls[0]?.[0]?.where?.receivedAt).toEqual({ gt: weekWindow(now).start, lte: now });
    expect(next.prisma.battle.findMany.mock.calls[0]?.[0]?.where?.receivedAt).toEqual({ gt: cursorAt, lte: now });
  });

  it('moves the cursor to now after applying XP', async () => {
    const { prisma, service } = setup();

    await service.run(now);

    expect(prisma.player.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId: 7n }, data: { progressionProcessedUntil: now } })
    );
  });

  it('writes only the progress columns of the tank row so the collector and mod columns stay intact', async () => {
    const { prisma, service } = setup();

    prisma.battle.findMany.mockResolvedValue(range(0, 20).map(() => modBattle()));

    await service.run(now);

    const args = prisma.playerTank.upsert.mock.calls[0]?.[0];

    expect(Object.keys(args?.update ?? {}).sort()).toEqual(['progressBattles', 'progressLevel', 'progressXp']);
    expect(args?.create).toMatchObject({ accountId: 7n, tankId, progressBattles: 20 });
  });

  it('grants one level reward per level crossed, each under its own key', async () => {
    const { prisma, ledger, service } = setup();

    prisma.battle.findMany.mockResolvedValue(range(0, 20).map(() => modBattle()));

    await service.run(now);

    const xp = prisma.playerTank.upsert.mock.calls[0]?.[0]?.create.progressXp ?? 0;
    const levels = grantsFor(ledger, 'level').map((input) => input.context?.level);
    const keys = grantsFor(ledger, 'level').map((input) => input.key);

    expect(tankLevelOf(xp).level).toBeGreaterThan(1);
    expect(levels).toEqual(range(2, tankLevelOf(xp).level + 1));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('sends one level-up notification with the final level and every shell granted', async () => {
    const { prisma, notifications, service, ledger } = setup();

    prisma.battle.findMany.mockResolvedValue(range(0, 20).map(() => modBattle()));

    await service.run(now);

    const level = tankLevelOf(prisma.playerTank.upsert.mock.calls[0]?.[0]?.create.progressXp ?? 0).level;
    const shells = grantsFor(ledger, 'level').reduce((sum, input) => sum + input.amount, 0);

    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u', notification: { event: 'tankLevelUp', tankId, tankName: 'Об. 140', level, shells } })
    );
  });

  it('stays silent when the rewards were already granted', async () => {
    const { prisma, notifications, service, ledger } = setup();

    ledger.grant.mockResolvedValue(false);
    prisma.battle.findMany.mockResolvedValue(range(0, 20).map(() => modBattle()));
    prisma.battle.findFirst.mockResolvedValue(mock<Battle>());

    await service.run(now);

    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('saves XP and moves the cursor in one transaction after the idempotent grants', async () => {
    const { prisma, ledger, service } = setup();

    prisma.battle.findMany.mockResolvedValue(range(0, 20).map(() => modBattle()));

    await service.run(now);

    const [operations] = prisma.$transaction.mock.calls[0] ?? [];

    expect(Array.isArray(operations) && operations.length).toBe(2);
    const levelOrders = ledger.grant.mock.invocationCallOrder.filter((_, index) => ledger.grant.mock.calls[index]?.[0].reason === 'level');

    expect(levelOrders.length).toBeGreaterThan(0);
    expect(Math.max(...levelOrders)).toBeLessThan(prisma.$transaction.mock.invocationCallOrder[0] ?? 0);
  });

  it('grants nothing for levels the tank had already reached', async () => {
    const { prisma, ledger, service } = setup();
    const xp = 50_000;

    prisma.playerTank.findMany.mockResolvedValue([progress({ progressXp: xp, progressLevel: tankLevelOf(xp).level })]);
    prisma.battle.findMany.mockResolvedValue([modBattle({ damageDealt: 0, frags: 0, spotted: 0, result: 'loss' })]);

    await service.run(now);

    expect(grantsFor(ledger, 'level')).toEqual([]);

    expect(prisma.playerTank.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ progressXp: { increment: expect.any(Number) } }) })
    );
  });

  it('adds the max-level bonus only when the max level is reached', async () => {
    const { prisma, ledger, service } = setup();
    const almost = tankLevelOf(Number.MAX_SAFE_INTEGER).levelXp - 1;

    prisma.playerTank.findMany.mockResolvedValue([progress({ progressXp: almost, progressLevel: TANK_LEVELS.max - 1 })]);
    prisma.battle.findMany.mockResolvedValue([modBattle()]);

    await service.run(now);

    expect(grantsFor(ledger, 'level').map((input) => [input.context?.level, input.amount])).toEqual([
      [TANK_LEVELS.max, PROGRESSION_REWARDS.levelShells + PROGRESSION_REWARDS.maxLevelShells]
    ]);
  });

  it('completes a weekly challenge once and pays for it once', async () => {
    const { prisma, ledger, notifications, service } = setup();

    prisma.battle.findMany.mockResolvedValue(range(0, 20).map(() => modBattle()));
    prisma.battle.findFirst.mockResolvedValue(mock<Battle>());

    await service.run(now);

    const paid = grantsFor(ledger, 'challenge');

    expect(paid.length).toBeGreaterThan(0);
    expect(paid.every((input) => input.amount === PROGRESSION_REWARDS.challengeShells)).toBe(true);
    expect(prisma.tankChallengeProgress.upsert.mock.calls.every(([args]) => args.update.completedAt === now)).toBe(true);

    const done = notifications.notify.mock.calls.filter(([input]) => input.notification.event === 'tankChallengeDone');

    expect(done.map(([input]) => input.dedupeKey)).toEqual(paid.map((input) => input.key));
  });

  it('does not pay again or move the completion time of an already completed challenge', async () => {
    const { prisma, ledger, service } = setup();
    const completedAt = new Date('2026-09-22T10:00:00Z');

    prisma.battle.findMany.mockResolvedValue(range(0, 20).map(() => modBattle()));

    prisma.tankChallengeProgress.findMany.mockResolvedValue(
      TANK_CHALLENGE_POOL.map(({ metric }) => Object.assign(mock<TankChallengeProgress>(), { tankId, code: metric, completedAt }))
    );

    await service.run(now);

    expect(grantsFor(ledger, 'challenge')).toEqual([]);
    expect(prisma.tankChallengeProgress.upsert.mock.calls.every(([args]) => !('completedAt' in args.update))).toBe(true);
  });

  it('reads the completed challenges of the week in one query for every tank', async () => {
    const { prisma, service } = setup();

    prisma.battle.findMany.mockResolvedValue(range(0, 20).map(() => modBattle()));

    await service.run(now);

    expect(prisma.tankChallengeProgress.upsert.mock.calls.length).toBeGreaterThan(1);
    expect(prisma.tankChallengeProgress.findMany).toHaveBeenCalledTimes(1);

    expect(prisma.tankChallengeProgress.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: 7n, weekStart: weekWindow(now).weekStart, tankId: { in: [tankId] }, completedAt: { not: null } }
      })
    );

    expect(prisma.tankChallengeProgress.findUnique).not.toHaveBeenCalled();
  });

  it('keeps going when one account fails and claims season rewards once per user', async () => {
    const { prisma, seasons, service } = setup();

    prisma.userLestaAccount.findMany.mockResolvedValue([link('u', 7n), link('u', 8n), link('v', 9n)]);

    prisma.player.findUnique.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('db down')).mockResolvedValueOnce(null);

    expect(await service.run(now)).toBe(2);
    expect(seasons.claimRewards.mock.calls.map(([input]) => input.userId)).toEqual(['u', 'v']);
  });

  it('parks the cursor of accounts without Plus at now so they never earn backlog XP', async () => {
    const { prisma, service } = setup();

    await service.run(now);

    expect(prisma.player.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { accountId: { notIn: [7n] }, progressionProcessedUntil: { lt: now } },
        data: { progressionProcessedUntil: now }
      })
    );
  });

  it('keeps the cursor of Plus accounts past the per-run cap so their battles wait for the next run', async () => {
    const { prisma, service } = setup();
    const accountIds = range(0, PROGRESSION_RUN.maxAccountsPerRun + 1).map((index) => BigInt(index + 1));

    prisma.userLestaAccount.findMany.mockResolvedValue(accountIds.map((accountId) => link('u', accountId)));

    expect(await service.run(now)).toBe(PROGRESSION_RUN.maxAccountsPerRun);
    expect(prisma.player.updateMany.mock.calls[0]?.[0]?.where?.accountId).toEqual({ notIn: accountIds });
  });

  it('serves the accounts with the oldest progression cursor first', async () => {
    const { prisma, service } = setup();

    await service.run(now);

    expect(prisma.userLestaAccount.findMany.mock.calls[0]?.[0]?.orderBy).toEqual([
      { player: { progressionProcessedUntil: { sort: 'asc', nulls: 'first' } } },
      { accountId: 'asc' }
    ]);
  });
});
