import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { StreamerProfile } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { EntitlementsService } from '../../../../billing';
import type { StreamerProfileWriterService } from '../streamer-profile-writer.service';

import { AppForbiddenException } from '../../../../../common/exceptions';
import { StreamerFollowWriterService } from '../streamer-follow-writer.service';

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const profiles = mock<StreamerProfileWriterService>();
  const entitlements = mock<EntitlementsService>();

  profiles.publicBySlug.mockResolvedValue(mock<StreamerProfile>({ id: 'p1', userId: 'streamer' }));
  prisma.streamerFollow.findMany.mockResolvedValue([]);

  return { service: new StreamerFollowWriterService(prisma, profiles, entitlements), prisma, entitlements };
};

describe('StreamerFollowWriterService.follow', () => {
  it('checks the follow limit for a new follow', async () => {
    const { service, prisma, entitlements } = createService();

    prisma.streamerFollow.findUnique.mockResolvedValue(null);
    prisma.streamerFollow.count.mockResolvedValue(3);

    await service.follow({ userId: 'u1', slug: 'jove' });

    expect(entitlements.assertWithinLimit).toHaveBeenCalledWith({ userId: 'u1', key: 'streamerFollows', count: 3, feature: 'streamerAlerts' });
    expect(entitlements.assertFeature).not.toHaveBeenCalled();
  });

  it('needs Plus for a tank filter', async () => {
    const { service, entitlements } = createService();

    entitlements.assertFeature.mockRejectedValue(new AppForbiddenException('SUBSCRIPTION_REQUIRED', 'Plus'));

    await expect(service.follow({ userId: 'u1', slug: 'jove', tankId: 7169 })).rejects.toBeInstanceOf(AppForbiddenException);
  });

  it('refuses to follow your own page', async () => {
    const { service } = createService();

    await expect(service.follow({ userId: 'streamer', slug: 'jove' })).rejects.toBeInstanceOf(AppForbiddenException);
  });
});
