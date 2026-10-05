import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Battle, StreamerChannel, StreamerFollow, StreamerProfile, Vehicle } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { NotificationService } from '../../../../notifications';
import type { LiveStream } from '../../lib/live-status/live-status.types';
import type { LivePlatformsService } from '../live-platforms.service';

import { LIVE } from '../../config/live.constants';
import { LiveStatusSyncService } from '../live-status-sync.service';

type ProfileFixture = Pick<StreamerProfile, 'accountId' | 'id' | 'isLive' | 'liveStartedAt' | 'liveTankId'> & {
  channels: Pick<StreamerChannel, 'handle' | 'platform'>[];
};

const now = new Date('2026-09-25T12:00:00Z');
const streamStart = new Date('2026-09-25T11:00:00Z');

const channel = (platform: StreamerChannel['platform'], handle: string) => mock<StreamerChannel>({ platform, handle });

const profileRow = ({ channels, ...fields }: ProfileFixture) =>
  Object.assign(mock<StreamerProfile>({ slug: 'jove', displayName: 'Jove', livePlatform: null, ...fields }), {
    channels: channels.map(({ platform, handle }) => channel(platform, handle))
  });

const offline = { isLive: false, liveTankId: null, accountId: null, liveStartedAt: null } satisfies Partial<ProfileFixture>;

const liveProfile = (fields: Partial<StreamerProfile> = {}) =>
  mock<StreamerProfile>({
    id: 'p1',
    slug: 'jove',
    displayName: 'Jove',
    isLive: true,
    livePlatform: 'twitch',
    liveTankId: null,
    liveStartedAt: streamStart,
    ...fields
  });

const follow = (fields: Partial<StreamerFollow>) => mock<StreamerFollow>({ profileId: 'p1', tankId: null, lastAlertKey: null, ...fields });

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const platforms = mock<LivePlatformsService>();
  const notifications = mock<NotificationService>();

  platforms.twitchStreams.mockResolvedValue([]);
  platforms.vkStreams.mockResolvedValue([]);
  platforms.youtubeLive.mockResolvedValue([]);
  prisma.streamerFollow.findMany.mockResolvedValue([]);
  prisma.battle.findFirst.mockResolvedValue(null);

  return { service: new LiveStatusSyncService(prisma, platforms, notifications), prisma, platforms, notifications };
};

const streamKey = (profile: StreamerProfile) => `${LIVE.alertDedupePrefix}:${profile.id}:${profile.liveStartedAt?.getTime() ?? 0}`;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('LiveStatusSyncService.poll', () => {
  it('does nothing when no claimed profile has a stream channel', async () => {
    const { service, prisma, platforms } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([]);

    await expect(service.poll()).resolves.toBe(0);
    expect(platforms.twitchStreams).not.toHaveBeenCalled();
    expect(prisma.streamerProfile.update).not.toHaveBeenCalled();
  });

  it('asks each platform for its own handles and YouTube only for channel ids', async () => {
    const { service, prisma, platforms } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([
      profileRow({
        id: 'p1',
        ...offline,
        channels: [
          { platform: 'twitch', handle: 'jove' },
          { platform: 'vkVideoLive', handle: 'jove_vk' },
          { platform: 'youtube', handle: 'UCjove' },
          { platform: 'youtube', handle: '@jove' }
        ]
      }),
      profileRow({ id: 'p2', ...offline, channels: [{ platform: 'twitch', handle: 'near_you' }] })
    ]);

    prisma.streamerProfile.update.mockResolvedValue(liveProfile({ isLive: false }));

    await service.poll();

    expect(platforms.twitchStreams).toHaveBeenCalledWith(['jove', 'near_you']);
    expect(platforms.vkStreams).toHaveBeenCalledWith(['jove_vk']);
    expect(platforms.youtubeLive).toHaveBeenCalledWith(['UCjove']);
  });

  it('marks a profile that went live with the busiest platform, its viewers and a start time', async () => {
    const { service, prisma, platforms } = createService();
    const streams: LiveStream[] = [
      { platform: 'twitch', handle: 'jove', viewers: 500 },
      { platform: 'vkVideoLive', handle: 'jove', viewers: 900 }
    ];

    prisma.streamerProfile.findMany.mockResolvedValue([
      profileRow({
        id: 'p1',
        ...offline,
        channels: [
          { platform: 'twitch', handle: 'Jove' },
          { platform: 'vkVideoLive', handle: 'jove' }
        ]
      })
    ]);

    platforms.twitchStreams.mockResolvedValue(streams.filter((stream) => stream.platform === 'twitch'));
    platforms.vkStreams.mockResolvedValue(streams.filter((stream) => stream.platform === 'vkVideoLive'));
    prisma.streamerProfile.update.mockResolvedValue(liveProfile());

    await expect(service.poll()).resolves.toBe(1);

    expect(prisma.streamerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ isLive: true, livePlatform: 'vkVideoLive', liveViewers: 900, liveCheckedAt: now, liveStartedAt: now })
      })
    );
  });

  it('keeps the original start time while a profile stays live', async () => {
    const { service, prisma, platforms } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([
      profileRow({ id: 'p1', ...offline, isLive: true, liveStartedAt: streamStart, channels: [{ platform: 'twitch', handle: 'jove' }] })
    ]);

    platforms.twitchStreams.mockResolvedValue([{ platform: 'twitch', handle: 'jove', viewers: 10 }]);
    prisma.streamerProfile.update.mockResolvedValue(liveProfile());

    await expect(service.poll()).resolves.toBe(0);
    expect(prisma.streamerProfile.update.mock.calls[0]?.[0].data).not.toHaveProperty('liveStartedAt');
  });

  it('treats a failing platform as offline and still updates every profile', async () => {
    const { service, prisma, platforms } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([
      profileRow({ id: 'p1', ...offline, isLive: true, liveStartedAt: streamStart, channels: [{ platform: 'twitch', handle: 'jove' }] }),
      profileRow({ id: 'p2', ...offline, channels: [{ platform: 'vkVideoLive', handle: 'vk_star' }] })
    ]);

    platforms.twitchStreams.mockRejectedValue(new Error('helix down'));
    platforms.vkStreams.mockResolvedValue([{ platform: 'vkVideoLive', handle: 'vk_star', viewers: 40 }]);
    prisma.streamerProfile.update.mockResolvedValue(liveProfile({ id: 'p2', livePlatform: 'vkVideoLive' }));

    await expect(service.poll()).resolves.toBe(2);

    expect(prisma.streamerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'p1' },
        data: expect.objectContaining({ isLive: false, livePlatform: null, liveViewers: null, liveTankId: null, liveStartedAt: null })
      })
    );

    expect(prisma.streamerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'p2' }, data: expect.objectContaining({ isLive: true }) })
    );
  });

  it('checks YouTube at most once per poll window and reuses the last answer in between', async () => {
    const { service, prisma, platforms } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([profileRow({ id: 'p1', ...offline, channels: [{ platform: 'youtube', handle: 'UCjove' }] })]);
    platforms.youtubeLive.mockResolvedValue([{ platform: 'youtube', handle: 'ucjove', viewers: null }]);
    prisma.streamerProfile.update.mockResolvedValue(liveProfile({ livePlatform: 'youtube' }));

    await service.poll();
    vi.setSystemTime(now.getTime() + LIVE.youtube.pollEveryMs - 1);
    await service.poll();

    expect(platforms.youtubeLive).toHaveBeenCalledTimes(1);

    expect(prisma.streamerProfile.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isLive: true, livePlatform: 'youtube' }) })
    );

    vi.setSystemTime(now.getTime() + LIVE.youtube.pollEveryMs);
    await service.poll();

    expect(platforms.youtubeLive).toHaveBeenCalledTimes(2);
  });

  it('keeps the cached YouTube answer empty after a failed check until the next window', async () => {
    const { service, prisma, platforms } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([profileRow({ id: 'p1', ...offline, channels: [{ platform: 'youtube', handle: 'UCjove' }] })]);
    platforms.youtubeLive.mockRejectedValueOnce(new Error('quota')).mockResolvedValue([{ platform: 'youtube', handle: 'ucjove', viewers: null }]);
    prisma.streamerProfile.update.mockResolvedValue(liveProfile({ isLive: false }));

    await service.poll();
    await service.poll();

    expect(platforms.youtubeLive).toHaveBeenCalledTimes(1);
    expect(prisma.streamerProfile.update).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ isLive: false }) }));
  });

  it('records the tank from the latest recent battle of a linked account', async () => {
    const { service, prisma, platforms } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([
      profileRow({
        id: 'p1',
        ...offline,
        isLive: true,
        accountId: 42n,
        liveStartedAt: streamStart,
        channels: [{ platform: 'twitch', handle: 'jove' }]
      })
    ]);

    platforms.twitchStreams.mockResolvedValue([{ platform: 'twitch', handle: 'jove', viewers: 1 }]);
    prisma.battle.findFirst.mockResolvedValue(mock<Battle>({ tankId: 7169 }));
    prisma.streamerProfile.update.mockResolvedValue(liveProfile({ liveTankId: 7169 }));

    await expect(service.poll()).resolves.toBe(1);

    expect(prisma.battle.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId: 42n, startedAt: { gte: new Date(now.getTime() - LIVE.tankWindowMs) } } })
    );

    expect(prisma.streamerProfile.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ liveTankId: 7169 }) }));
  });

  it('skips the tank lookup for offline profiles and profiles without an account', async () => {
    const { service, prisma, platforms } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([
      profileRow({ id: 'p1', ...offline, channels: [{ platform: 'twitch', handle: 'jove' }] }),
      profileRow({ id: 'p2', ...offline, accountId: 42n, channels: [{ platform: 'twitch', handle: 'idle' }] })
    ]);

    platforms.twitchStreams.mockResolvedValue([{ platform: 'twitch', handle: 'jove', viewers: 1 }]);
    prisma.streamerProfile.update.mockResolvedValue(liveProfile({ isLive: false }));

    await service.poll();

    expect(prisma.battle.findFirst).not.toHaveBeenCalled();
  });
});

describe('LiveStatusSyncService live alerts', () => {
  const pollLive = async (setup: (context: ReturnType<typeof createService>) => void, updated = liveProfile()) => {
    const context = createService();

    context.prisma.streamerProfile.findMany.mockResolvedValue([
      profileRow({ id: 'p1', ...offline, channels: [{ platform: 'twitch', handle: 'jove' }] })
    ]);

    context.platforms.twitchStreams.mockResolvedValue([{ platform: 'twitch', handle: 'jove', viewers: 1 }]);
    context.prisma.streamerProfile.update.mockResolvedValue(updated);
    setup(context);
    await context.service.poll();

    return context;
  };

  it('notifies each follower once per stream and remembers the alert key', async () => {
    const updated = liveProfile();
    const { notifications, prisma } = await pollLive(({ prisma: db }) => {
      db.streamerFollow.findMany.mockResolvedValue([follow({ userId: 'fan' }), follow({ userId: 'already', lastAlertKey: streamKey(updated) })]);
    }, updated);

    expect(notifications.notify).toHaveBeenCalledTimes(1);

    expect(notifications.notify).toHaveBeenCalledWith({
      userId: 'fan',
      dedupeKey: streamKey(updated),
      notification: { event: 'streamerLive', slug: updated.slug, displayName: updated.displayName, platform: 'twitch', tankName: null }
    });

    expect(prisma.streamerFollow.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_profileId: { userId: 'fan', profileId: 'p1' } },
        data: { lastAlertKey: streamKey(updated) }
      })
    );
  });

  it('notifies tank followers only when the streamer is on that tank, naming it', async () => {
    const updated = liveProfile({ liveTankId: 7169 });
    const { notifications, prisma } = await pollLive(({ prisma: db }) => {
      db.streamerFollow.findMany.mockResolvedValue([follow({ userId: 'is7-fan', tankId: 7169 }), follow({ userId: 'other-fan', tankId: 1 })]);
      db.vehicle.findUnique.mockResolvedValue(mock<Vehicle>({ name: 'ИС-7' }));
    }, updated);

    expect(prisma.vehicle.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { tankId: 7169 } }));
    expect(notifications.notify).toHaveBeenCalledTimes(1);

    expect(notifications.notify).toHaveBeenCalledWith({
      userId: 'is7-fan',
      dedupeKey: `${streamKey(updated)}:7169`,
      notification: expect.objectContaining({ tankName: 'ИС-7' })
    });
  });

  it('sends nothing and skips the tank lookup when every follower was already alerted', async () => {
    const updated = liveProfile({ liveTankId: 7169 });
    const { notifications, prisma } = await pollLive(({ prisma: db }) => {
      db.streamerFollow.findMany.mockResolvedValue([follow({ userId: 'fan', lastAlertKey: streamKey(updated) })]);
    }, updated);

    expect(notifications.notify).not.toHaveBeenCalled();
    expect(prisma.vehicle.findUnique).not.toHaveBeenCalled();
  });

  it('alerts again for a new stream with a different start time', async () => {
    const previous = liveProfile({ liveStartedAt: new Date('2026-09-24T18:00:00Z') });
    const { notifications } = await pollLive(({ prisma: db }) => {
      db.streamerFollow.findMany.mockResolvedValue([follow({ userId: 'fan', lastAlertKey: streamKey(previous) })]);
    });

    expect(notifications.notify).toHaveBeenCalledTimes(1);
  });

  it('does not alert anyone for offline profiles', async () => {
    const { service, prisma, notifications } = createService();

    prisma.streamerProfile.findMany.mockResolvedValue([profileRow({ id: 'p1', ...offline, channels: [{ platform: 'twitch', handle: 'jove' }] })]);
    prisma.streamerProfile.update.mockResolvedValue(liveProfile({ isLive: false }));
    prisma.streamerFollow.findMany.mockResolvedValue([follow({ userId: 'fan' })]);

    await service.poll();

    expect(prisma.streamerFollow.findMany).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });
});
