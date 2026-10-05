import type { WatchlistDigest } from '@otmetki/schemas';

import { WATCHLIST } from '@otmetki/schemas';
import { subHours } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountRating, Clan, Follow, NotificationSettings, Player } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { EntitlementsService } from '../../../billing';
import type { CollectorProducerService } from '../../../collector';
import type { PlayerActivityRow } from '../../watchlist.types';
import type { WatchlistActivityService } from '../watchlist-activity.service';

import { AppForbiddenException } from '../../../../common/exceptions';
import { NOTIFICATION_DEFAULTS } from '../../../notifications';
import { WatchlistService } from '../watchlist.service';

const now = new Date('2026-09-26T10:00:00Z');
const followedAt = new Date('2026-09-01T00:00:00Z');

const follow = (targetId: bigint) => mock<Follow>({ id: `f${targetId}`, targetId, createdAt: followedAt });

const activityOf = (accountId: bigint, fields: Partial<PlayerActivityRow> = {}): [bigint, PlayerActivityRow] => [
  accountId,
  { accountId, battles: 0, wins: 0, damage: 0, lastBattleAt: null, marksGained: 0, ...fields }
];

const setup = () => {
  const prisma = mockDeep<PrismaService>();
  const entitlements = mockDeep<EntitlementsService>();
  const collector = mockDeep<CollectorProducerService>();
  const activity = mockDeep<WatchlistActivityService>();

  prisma.follow.findMany.mockResolvedValue([]);
  prisma.player.findMany.mockResolvedValue([]);
  prisma.accountRating.findMany.mockResolvedValue([]);
  prisma.notificationSettings.findUnique.mockResolvedValue(null);
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  activity.activity.mockResolvedValue(new Map());
  entitlements.limit.mockResolvedValue(10);

  return { prisma, entitlements, collector, activity, service: new WatchlistService(prisma, entitlements, collector, activity) };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('WatchlistService.list', () => {
  it('looks back over the requested period', async () => {
    const { activity, service } = setup();

    await service.list({ userId: 'u1', query: { period: '7d' } });

    expect(activity.activity).toHaveBeenCalledWith(expect.objectContaining({ since: subHours(now, WATCHLIST.periodHours['7d']) }));
  });

  it('shows nothing about a watched player who asked for their data to be hidden', async () => {
    const { prisma, service } = setup();

    prisma.follow.findMany.mockResolvedValue([follow(1n), follow(2n)]);

    prisma.player.findMany.mockResolvedValue([
      mock<Player>({ accountId: 1n, nickname: 'hidden', clanId: null, lastBattleAt: null, isHidden: true }),
      mock<Player>({ accountId: 2n, nickname: 'tanker', clanId: null, lastBattleAt: null, isHidden: false })
    ]);

    const { players } = await service.list({ userId: 'u1', query: { period: '24h' } });

    expect(players.map((player) => player.accountId)).toEqual([2]);
  });

  it('reports the plan limit for watched players', async () => {
    const { entitlements, service } = setup();

    entitlements.limit.mockResolvedValue(50);

    expect((await service.list({ userId: 'u1', query: { period: '24h' } })).limit).toBe(50);
  });

  it('leaves win rate and average damage empty for a player without battles', async () => {
    const { prisma, service } = setup();

    prisma.follow.findMany.mockResolvedValue([follow(1n)]);

    const [player] = (await service.list({ userId: 'u1', query: { period: '24h' } })).players;

    expect(player).toMatchObject({ battles: 0, wins: 0, winRate: null, avgDamage: null, marksGained: 0, wn8: null, nickname: null });
  });

  it('derives win rate and average damage from the period activity', async () => {
    const { prisma, activity, service } = setup();

    prisma.follow.findMany.mockResolvedValue([follow(1n)]);
    activity.activity.mockResolvedValue(new Map([activityOf(1n, { battles: 4, wins: 1, damage: 8_000 })]));

    const [player] = (await service.list({ userId: 'u1', query: { period: '24h' } })).players;

    expect(player).toMatchObject({ winRate: 25, avgDamage: 2_000 });
  });

  it('prefers the player record last battle over the session one', async () => {
    const { prisma, activity, service } = setup();
    const playerLast = new Date('2026-09-26T09:00:00Z');

    prisma.follow.findMany.mockResolvedValue([follow(1n), follow(2n)]);

    prisma.player.findMany.mockResolvedValue([
      mock<Player>({ accountId: 1n, nickname: 'A', clanId: null, lastBattleAt: playerLast, isHidden: false })
    ]);

    activity.activity.mockResolvedValue(
      new Map([
        activityOf(1n, { lastBattleAt: new Date('2026-09-25T00:00:00Z') }),
        activityOf(2n, { lastBattleAt: new Date('2026-09-24T00:00:00Z') })
      ])
    );

    const players = (await service.list({ userId: 'u1', query: { period: '24h' } })).players;

    expect(players.map((player) => player.lastBattleAt)).toEqual([playerLast.toISOString(), '2026-09-24T00:00:00.000Z']);
  });

  it('skips the clan lookup when no followed player is in a clan', async () => {
    const { prisma, service } = setup();

    prisma.follow.findMany.mockResolvedValue([follow(1n)]);
    prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: 1n, nickname: 'A', clanId: null, lastBattleAt: null, isHidden: false })]);

    await service.list({ userId: 'u1', query: { period: '24h' } });

    expect(prisma.clan.findMany).not.toHaveBeenCalled();
  });

  it('shows the clan tag and WN8 of a followed player', async () => {
    const { prisma, service } = setup();

    prisma.follow.findMany.mockResolvedValue([follow(1n)]);
    prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: 1n, nickname: 'A', clanId: 42n, lastBattleAt: null, isHidden: false })]);
    prisma.clan.findMany.mockResolvedValue([mock<Clan>({ clanId: 42n, tag: 'TAG' })]);
    prisma.accountRating.findMany.mockResolvedValue([mock<AccountRating>({ accountId: 1n, wn8: 2_100 })]);

    const [player] = (await service.list({ userId: 'u1', query: { period: '24h' } })).players;

    expect(player).toMatchObject({ clanTag: 'TAG', wn8: 2_100 });
  });
});

describe('WatchlistService.add', () => {
  it('checks the plan limit against the current count before following a new player', async () => {
    const { prisma, entitlements, collector, service } = setup();

    prisma.follow.findUnique.mockResolvedValue(null);
    prisma.follow.count.mockResolvedValue(3);

    await service.add({ userId: 'u1', accountId: 7 });

    expect(entitlements.assertWithinLimit).toHaveBeenCalledWith(expect.objectContaining({ userId: 'u1', key: 'watchedPlayers', count: 3 }));
    expect(prisma.follow.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { isFollowing: true } }));
    expect(collector.enrol).toHaveBeenCalledWith(expect.objectContaining({ accountId: 7, priority: 'high' }));
  });

  it('follows a player who is only a favourite, counting only followed players against the limit', async () => {
    const { prisma, entitlements, service } = setup();

    prisma.follow.findUnique.mockResolvedValue(mock<Follow>({ id: 'f7', isFollowing: false, isFavorite: true }));
    prisma.follow.count.mockResolvedValue(3);

    await service.add({ userId: 'u1', accountId: 7 });

    expect(prisma.follow.count).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1', kind: 'player', isFollowing: true } }));
    expect(entitlements.assertWithinLimit).toHaveBeenCalled();
    expect(prisma.follow.upsert).toHaveBeenCalled();
  });

  it('does not follow or enrol a player once the free limit is reached', async () => {
    const { prisma, entitlements, collector, service } = setup();

    prisma.follow.findUnique.mockResolvedValue(null);
    prisma.follow.count.mockResolvedValue(10);
    entitlements.assertWithinLimit.mockRejectedValue(new AppForbiddenException('SUBSCRIPTION_REQUIRED', 'limit'));

    await expect(service.add({ userId: 'u1', accountId: 7 })).rejects.toMatchObject({ status: 403 });
    expect(prisma.follow.upsert).not.toHaveBeenCalled();
    expect(collector.enrol).not.toHaveBeenCalled();
  });

  it('treats a player already on the list as a no-op even at the limit', async () => {
    const { prisma, entitlements, collector, service } = setup();

    prisma.follow.findUnique.mockResolvedValue(mock<Follow>({ id: 'f7', isFollowing: true }));
    prisma.follow.count.mockResolvedValue(10);

    await service.add({ userId: 'u1', accountId: 7 });

    expect(entitlements.assertWithinLimit).not.toHaveBeenCalled();
    expect(prisma.follow.upsert).not.toHaveBeenCalled();
    expect(collector.enrol).not.toHaveBeenCalled();
  });

  it('returns the list for the default period', async () => {
    const { prisma, service } = setup();

    prisma.follow.findUnique.mockResolvedValue(mock<Follow>({ id: 'f7', isFollowing: true }));

    expect((await service.add({ userId: 'u1', accountId: 7 })).period).toBe(WATCHLIST.defaultPeriod);
  });
});

describe('WatchlistService.remove', () => {
  it('refuses a player who is not on the watchlist', async () => {
    const { prisma, service } = setup();

    prisma.follow.deleteMany.mockResolvedValue({ count: 0 });
    prisma.follow.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.remove({ userId: 'u1', accountId: 7 })).rejects.toMatchObject({ status: 404 });
  });

  it('unfollows a watched player', async () => {
    const { prisma, service } = setup();

    prisma.follow.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.remove({ userId: 'u1', accountId: 7 })).resolves.toBeUndefined();
  });

  it('keeps a watched player who is also a favourite, only unfollowing them', async () => {
    const { prisma, service } = setup();

    prisma.follow.deleteMany.mockResolvedValue({ count: 0 });
    prisma.follow.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.remove({ userId: 'u1', accountId: 7 })).resolves.toBeUndefined();

    expect(prisma.follow.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', kind: 'player', targetId: 7n, isFollowing: true } })
    );
  });
});

describe('WatchlistService.settings', () => {
  it('uses the default digest before the user has saved settings', async () => {
    const { service } = setup();

    expect(await service.settings('u1')).toEqual({ digest: WATCHLIST.defaultDigest, lastDigestAt: null });
  });

  it('returns the saved digest and when it was last sent', async () => {
    const { prisma, service } = setup();

    prisma.notificationSettings.findUnique.mockResolvedValue(mock<NotificationSettings>({ watchlistDigest: 'weekly', watchlistDigestAt: now }));

    expect(await service.settings('u1')).toEqual({ digest: 'weekly', lastDigestAt: now.toISOString() });
  });
});

describe('WatchlistService.updateSettings', () => {
  it('requires Plus for an hourly digest', async () => {
    const { prisma, entitlements, service } = setup();

    entitlements.assertFeature.mockRejectedValue(new AppForbiddenException('SUBSCRIPTION_REQUIRED', 'Plus'));

    await expect(service.updateSettings({ userId: 'u1', digest: 'hourly' })).rejects.toMatchObject({ status: 403 });
    expect(prisma.notificationSettings.upsert).not.toHaveBeenCalled();
  });

  it('lets a free user pick a daily, weekly or no digest', async () => {
    const { prisma, entitlements, service } = setup();

    prisma.notificationSettings.upsert.mockResolvedValue(mock<NotificationSettings>({ watchlistDigest: 'off', watchlistDigestAt: null }));

    const digests: WatchlistDigest[] = ['daily', 'weekly', 'off'];

    for (const digest of digests) {
      await service.updateSettings({ userId: 'u1', digest });
    }

    expect(entitlements.assertFeature).not.toHaveBeenCalled();
    expect(prisma.notificationSettings.upsert).toHaveBeenCalledTimes(3);
  });

  it('creates missing notification settings with the notification defaults', async () => {
    const { prisma, service } = setup();

    prisma.notificationSettings.upsert.mockResolvedValue(mock<NotificationSettings>({ watchlistDigest: 'weekly', watchlistDigestAt: null }));

    await service.updateSettings({ userId: 'u1', digest: 'weekly' });

    expect(prisma.notificationSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          channels: [...NOTIFICATION_DEFAULTS.channels],
          events: [...NOTIFICATION_DEFAULTS.events],
          watchlistDigest: 'weekly'
        }),
        update: { watchlistDigest: 'weekly' }
      })
    );
  });
});
