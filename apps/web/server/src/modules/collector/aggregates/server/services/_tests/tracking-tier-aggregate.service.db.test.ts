import { subDays } from 'date-fns';
import { afterAll, beforeEach, expect, it } from 'vitest';

import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../../../core/prisma/_tests/test-database';
import { playerSeed } from '../../../_tests/aggregates.seeds';
import { serverQueries } from '../../providers/server-queries.provider';
import { TrackingTierAggregateService } from '../tracking-tier-aggregate.service';

const ACCOUNT = {
  followed: 1_000_000_701n,
  linked: 1_000_000_702n,
  device: 1_000_000_703n,
  revokedDevice: 1_000_000_704n,
  unviewed: 1_000_000_705n,
  viewed: 1_000_000_706n,
  pinnedActive: 1_000_000_707n,
  returning: 1_000_000_708n,
  inactive: 1_000_000_709n,
  idleAndInactive: 1_000_000_710n
} as const;

const daysAgo = (days: number) => subDays(new Date(), days);

describeWithDatabase('TrackingTierAggregateService', () => {
  const prisma = createTestPrisma();

  const run = () => new TrackingTierAggregateService(prisma, serverQueries).run();

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['follow', 'user_lesta_account', 'mod_device', 'player', 'user'] });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('pins followed, linked and mod accounts to active, demotes idle actives, revives returning and retires inactive players', async () => {
    const recentBattle = daysAgo(1);
    const oldBattle = daysAgo(120);

    await prisma.player.createMany({
      data: [
        playerSeed(ACCOUNT.followed, { trackingTier: 'population', lastBattleAt: recentBattle }),
        playerSeed(ACCOUNT.linked, { trackingTier: 'dormant', lastBattleAt: recentBattle }),
        playerSeed(ACCOUNT.device, { trackingTier: 'population', lastBattleAt: recentBattle }),
        playerSeed(ACCOUNT.revokedDevice, { trackingTier: 'population', lastBattleAt: null }),
        playerSeed(ACCOUNT.unviewed, { trackingTier: 'active', lastViewedAt: null, lastBattleAt: recentBattle }),
        playerSeed(ACCOUNT.viewed, { trackingTier: 'active', lastViewedAt: daysAgo(2), lastBattleAt: recentBattle }),
        playerSeed(ACCOUNT.pinnedActive, { trackingTier: 'active', lastViewedAt: daysAgo(60), lastBattleAt: oldBattle }),
        playerSeed(ACCOUNT.returning, { trackingTier: 'dormant', lastBattleAt: recentBattle }),
        playerSeed(ACCOUNT.inactive, { trackingTier: 'population', lastBattleAt: oldBattle }),
        playerSeed(ACCOUNT.idleAndInactive, { trackingTier: 'active', lastViewedAt: daysAgo(60), lastBattleAt: oldBattle })
      ]
    });

    const user = await prisma.user.create({ data: { name: 'fan', email: 'fan@example.com' } });

    await prisma.follow.createMany({
      data: [
        { userId: user.id, kind: 'player', targetId: ACCOUNT.followed, events: [] },
        { userId: user.id, kind: 'player', targetId: ACCOUNT.pinnedActive, events: [] },
        { userId: user.id, kind: 'clan', targetId: ACCOUNT.inactive, events: [] }
      ]
    });

    await prisma.userLestaAccount.create({ data: { userId: user.id, accountId: ACCOUNT.linked } });

    await prisma.modDevice.createMany({
      data: [
        { userId: user.id, secretHash: 'live', accountId: ACCOUNT.device },
        { userId: user.id, secretHash: 'revoked', accountId: ACCOUNT.revokedDevice, revokedAt: daysAgo(1) },
        { userId: user.id, secretHash: 'unbound', accountId: null }
      ]
    });

    const result = await run();
    const players = await prisma.player.findMany({ select: { accountId: true, trackingTier: true }, orderBy: { accountId: 'asc' } });

    expect(result).toEqual({ promoted: 3, demoted: 2, revived: 1, retired: 2 });

    expect(players.map((player) => player.trackingTier)).toEqual([
      'active',
      'active',
      'active',
      'population',
      'population',
      'active',
      'active',
      'population',
      'dormant',
      'dormant'
    ]);
  });

  it('schedules a promoted account for an immediate poll', async () => {
    const before = daysAgo(1);

    await prisma.player.create({ data: playerSeed(ACCOUNT.followed, { trackingTier: 'population', nextPollAt: daysAgo(30) }) });

    const user = await prisma.user.create({ data: { name: 'fan', email: 'fan@example.com' } });

    await prisma.follow.create({ data: { userId: user.id, kind: 'player', targetId: ACCOUNT.followed, events: [] } });

    await run();

    const player = await prisma.player.findUniqueOrThrow({ where: { accountId: ACCOUNT.followed } });

    expect(player.nextPollAt!.getTime()).toBeGreaterThan(before.getTime());
  });
});
