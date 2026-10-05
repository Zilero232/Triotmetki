import type { StreamerVideo } from '@otmetki/schemas';

import RedisMock from 'ioredis-mock';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { StreamerChannel, StreamerProfile } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { LivePlatformsService } from '../../../live';

import { Prisma } from '../../../../../../generated';
import { AppBadRequestException, AppForbiddenException, AppNotFoundException } from '../../../../../common/exceptions';
import { STREAMERS } from '../../config/directory.constants';
import { StreamerCardsReaderService } from '../streamer-cards-reader.service';
import { StreamerProfileWriterService } from '../streamer-profile-writer.service';

const CREATED_AT = new Date('2026-09-01T00:00:00Z');
const YOUTUBE_ID = 'UCabcdefghijklmnopqrstuv';

const profileRow = (overrides: Partial<StreamerProfile> = {}): StreamerProfile => ({
  id: 'p1',
  userId: 'u1',
  kind: 'claimed',
  slug: 'jove',
  displayName: 'Jove',
  accountId: 1001n,
  accountSourceUrl: null,
  bio: null,
  links: null,
  settings: null,
  settingsUpdatedAt: null,
  isLive: false,
  liveTankId: null,
  liveViewers: null,
  livePlatform: null,
  liveStartedAt: null,
  liveCheckedAt: null,
  hiddenAt: null,
  mergedIntoId: null,
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  ...overrides
});

const channelRow = (overrides: Partial<StreamerChannel> = {}): StreamerChannel => ({
  id: 'c1',
  profileId: 'p1',
  platform: 'twitch',
  handle: 'jove',
  url: 'https://twitch.tv/jove',
  externalId: null,
  verifiedAt: null,
  sourceUrl: null,
  createdAt: CREATED_AT,
  ...overrides
});

const video: StreamerVideo = { id: 'v1', title: 'Three marks', url: 'https://youtube.com/watch?v=v1', publishedAt: '2026-09-10T00:00:00.000Z' };

const duplicate = () => new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' });

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const platforms = mock<LivePlatformsService>();
  const redis = new RedisMock();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.streamerChannel.findMany.mockResolvedValue([]);
  prisma.streamerFollow.count.mockResolvedValue(0);
  platforms.youtubeVideos.mockResolvedValue([video]);

  return { service: new StreamerProfileWriterService(prisma, new StreamerCardsReaderService(prisma), platforms, redis), prisma, platforms };
};

describe('StreamerProfileWriterService.get', () => {
  it('refuses a user without a streamer profile', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(null);

    await expect(service.get('u1')).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('returns the profile view with its followers and account as a number', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(profileRow());
    prisma.streamerFollow.count.mockResolvedValue(7);

    expect(await service.get('u1')).toMatchObject({ slug: 'jove', accountId: 1001, followers: 7, hasSettings: false, live: null, latestVideos: [] });
  });
});

describe('StreamerProfileWriterService.publicBySlug', () => {
  it('hides a profile hidden by moderation', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(profileRow({ hiddenAt: CREATED_AT }));

    await expect(service.publicBySlug('jove')).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it.runIf(!STREAMERS.editorialEnabled)('hides an editorial profile while editorial profiles are off', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(profileRow({ kind: 'editorial', userId: null }));

    await expect(service.publicBySlug('jove')).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('returns a visible claimed profile', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(profileRow());

    expect(await service.publicBySlug('jove')).toMatchObject({ id: 'p1' });
  });
});

describe('StreamerProfileWriterService.upsert', () => {
  it('refuses to attach a Lesta account the user has not linked', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.count.mockResolvedValue(0);

    await expect(service.upsert({ userId: 'u1', slug: 'jove', displayName: 'Jove', accountId: 1001 })).rejects.toBeInstanceOf(AppForbiddenException);
    expect(prisma.streamerProfile.upsert).not.toHaveBeenCalled();
  });

  it('reports a taken slug as a conflict', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.upsert.mockRejectedValue(duplicate());

    await expect(service.upsert({ userId: 'u1', slug: 'jove', displayName: 'Jove' })).rejects.toMatchObject({
      response: { code: 'STREAMER_SLUG_TAKEN' }
    });
  });

  it('passes through a database error that is not a unique violation', async () => {
    const { service, prisma } = createService();
    const failure = new Error('connection lost');

    prisma.streamerProfile.upsert.mockRejectedValue(failure);

    await expect(service.upsert({ userId: 'u1', slug: 'jove', displayName: 'Jove' })).rejects.toBe(failure);
  });

  it('reports a channel owned by another streamer as a conflict', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.upsert.mockResolvedValue(profileRow());
    prisma.streamerChannel.create.mockRejectedValue(duplicate());

    await expect(
      service.upsert({ userId: 'u1', slug: 'jove', displayName: 'Jove', channels: [{ platform: 'twitch', url: 'https://twitch.tv/jove' }] })
    ).rejects.toMatchObject({ response: { code: 'STREAMER_CHANNEL_TAKEN' } });
  });

  it('clears the account on null and leaves it untouched when omitted', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.upsert.mockResolvedValue(profileRow());

    await service.upsert({ userId: 'u1', slug: 'jove', displayName: 'Jove', accountId: null });
    await service.upsert({ userId: 'u1', slug: 'jove', displayName: 'Jove' });

    const [cleared, untouched] = prisma.streamerProfile.upsert.mock.calls.map(([args]) => args.update);

    expect(cleared).toHaveProperty('accountId', null);
    expect(untouched).not.toHaveProperty('accountId');
    expect(prisma.userLestaAccount.count).not.toHaveBeenCalled();
  });

  it('creates a new profile as claimed by its user', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.count.mockResolvedValue(1);
    prisma.streamerProfile.upsert.mockResolvedValue(profileRow());

    await service.upsert({ userId: 'u1', slug: 'jove', displayName: 'Jove', accountId: 1001 });

    expect(prisma.streamerProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ userId: 'u1', kind: 'claimed', accountId: 1001n }) })
    );
  });
});

describe('StreamerProfileWriterService.replaceChannels', () => {
  it('refuses a url that is not a channel of the named platform', async () => {
    const { service, prisma } = createService();

    await expect(
      service.replaceChannels({ profileId: 'p1', channels: [{ platform: 'twitch', url: 'https://youtube.com/@jove' }] })
    ).rejects.toBeInstanceOf(AppBadRequestException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps a channel that is still listed, drops the unlisted ones and creates the new ones', async () => {
    const { service, prisma } = createService();

    prisma.streamerChannel.findMany.mockResolvedValue([
      channelRow({ id: 'kept', platform: 'twitch', handle: 'jove' }),
      channelRow({ id: 'gone', platform: 'telegram', handle: 'jove_news' })
    ]);

    await service.replaceChannels({
      profileId: 'p1',
      channels: [
        { platform: 'twitch', url: 'https://www.twitch.tv/Jove/' },
        { platform: 'youtube', url: 'https://youtube.com/@JoveYT', sourceUrl: 'https://joves-modpack.ru/' }
      ]
    });

    expect(prisma.streamerChannel.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { profileId: 'p1', id: { notIn: ['kept'] } } }));
    expect(prisma.streamerChannel.create).toHaveBeenCalledTimes(1);

    expect(prisma.streamerChannel.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ platform: 'youtube', handle: '@joveyt', sourceUrl: 'https://joves-modpack.ru/' })
      })
    );
  });
});

describe('StreamerProfileWriterService.toView', () => {
  it('lists latest videos only for a YouTube channel with a channel id', async () => {
    const { service, prisma, platforms } = createService();

    prisma.streamerChannel.findMany.mockResolvedValue([channelRow({ platform: 'youtube', handle: '@jove', url: 'https://youtube.com/@jove' })]);

    expect((await service.toView(profileRow())).latestVideos).toEqual([]);
    expect(platforms.youtubeVideos).not.toHaveBeenCalled();
  });

  it('fetches latest videos once and serves the next view from the cache', async () => {
    const { service, prisma, platforms } = createService();

    prisma.streamerChannel.findMany.mockResolvedValue([
      channelRow({ platform: 'youtube', handle: YOUTUBE_ID, url: `https://youtube.com/channel/${YOUTUBE_ID}` })
    ]);

    const first = await service.toView(profileRow());
    const second = await service.toView(profileRow());

    expect(first.latestVideos).toEqual([video]);
    expect(second.latestVideos).toEqual([video]);
    expect(platforms.youtubeVideos).toHaveBeenCalledTimes(1);
  });

  it('reports settings, verification and a missing account', async () => {
    const { service, prisma } = createService();

    prisma.streamerChannel.findMany.mockResolvedValue([channelRow({ verifiedAt: CREATED_AT })]);
    const view = await service.toView(profileRow({ accountId: null, settings: {}, settingsUpdatedAt: CREATED_AT }));

    expect(view).toMatchObject({ accountId: null, hasSettings: true, channels: [{ platform: 'twitch', handle: 'jove', verified: true }] });
  });
});
