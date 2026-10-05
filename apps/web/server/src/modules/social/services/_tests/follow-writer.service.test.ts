import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Follow } from '../../../../../generated';
import type { UserLestaAccountsService } from '../../../../core';
import type { EntitlementsService } from '../../../billing';

import { AppConflictException, AppForbiddenException, AppNotFoundException } from '../../../../common/exceptions';
import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { FEED } from '../../config/feed.constants';
import { FollowReaderService } from '../follow-reader.service';
import { FollowWriterService } from '../follow-writer.service';

const at = new Date('2026-09-01T00:00:00Z');

const follow = (targetId: bigint): Follow => ({
  id: `f-${targetId}`,
  userId: 'u1',
  kind: 'player',
  targetId,
  events: [],
  isFollowing: true,
  isFavorite: false,
  label: null,
  isOwn: false,
  createdAt: at,
  updatedAt: at
});

const createService = () => {
  const prisma = mockPrismaService();
  const entitlements = mock<EntitlementsService>();

  prisma.follow.findMany.mockResolvedValue([]);
  prisma.player.findMany.mockResolvedValue([]);
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  const reader = new FollowReaderService(prisma, mock<UserLestaAccountsService>());

  return { service: new FollowWriterService(prisma, entitlements, reader), prisma, entitlements };
};

describe('FollowWriterService.create', () => {
  it('refuses a follow once the limit is reached', async () => {
    const { service, prisma } = createService();

    prisma.follow.count.mockResolvedValue(FEED.maxFollows);

    await expect(service.create({ userId: 'u1', kind: 'player', targetId: 7 })).rejects.toBeInstanceOf(AppConflictException);
    expect(prisma.follow.upsert).not.toHaveBeenCalled();
  });

  it('accepts the last follow below the limit', async () => {
    const { service, prisma } = createService();

    prisma.follow.count.mockResolvedValue(FEED.maxFollows - 1);

    await service.create({ userId: 'u1', kind: 'player', targetId: 7 });

    expect(prisma.follow.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId_kind_targetId: { userId: 'u1', kind: 'player', targetId: 7n } } })
    );
  });

  it('checks the watched-tanks limit against the tanks already watched', async () => {
    const { service, prisma, entitlements } = createService();

    prisma.follow.count.mockResolvedValueOnce(20).mockResolvedValueOnce(9);
    prisma.follow.findUnique.mockResolvedValue(null);

    await service.create({ userId: 'u1', kind: 'tank', targetId: 7 });

    expect(entitlements.assertWithinLimit).toHaveBeenCalledWith({ userId: 'u1', key: 'watchedTanks', count: 9 });
  });

  it('refuses a new watched tank over the limit', async () => {
    const { service, prisma, entitlements } = createService();

    prisma.follow.count.mockResolvedValue(10);
    prisma.follow.findUnique.mockResolvedValue(null);

    entitlements.assertWithinLimit.mockRejectedValue(
      new AppForbiddenException('SUBSCRIPTION_REQUIRED', 'limit', { limitKey: 'watchedTanks', limit: 10 })
    );

    await expect(service.create({ userId: 'u1', kind: 'tank', targetId: 7 })).rejects.toBeInstanceOf(AppForbiddenException);
    expect(prisma.follow.upsert).not.toHaveBeenCalled();
  });

  it('keeps an already watched tank without a limit check', async () => {
    const { service, prisma, entitlements } = createService();

    prisma.follow.count.mockResolvedValue(400);
    prisma.follow.findUnique.mockResolvedValue({ ...follow(7n), kind: 'tank' });

    await service.create({ userId: 'u1', kind: 'tank', targetId: 7 });

    expect(entitlements.assertWithinLimit).not.toHaveBeenCalled();
  });

  it('checks the watched-tanks limit when the tank is only a favourite', async () => {
    const { service, prisma, entitlements } = createService();

    prisma.follow.count.mockResolvedValue(3);
    prisma.follow.findUnique.mockResolvedValue({ ...follow(7n), kind: 'tank', isFollowing: false, isFavorite: true });

    await service.create({ userId: 'u1', kind: 'tank', targetId: 7 });

    expect(entitlements.assertWithinLimit).toHaveBeenCalled();
    expect(prisma.follow.count).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1', kind: 'tank', isFollowing: true } }));
  });

  it('does not count player follows against the watched-tanks limit', async () => {
    const { service, prisma, entitlements } = createService();

    prisma.follow.count.mockResolvedValue(3);

    await service.create({ userId: 'u1', kind: 'player', targetId: 7 });

    expect(entitlements.assertWithinLimit).not.toHaveBeenCalled();
  });
});

describe('FollowWriterService.remove', () => {
  it('reports a follow that is not the caller’s as missing', async () => {
    const { service, prisma } = createService();

    prisma.follow.deleteMany.mockResolvedValue({ count: 0 });
    prisma.follow.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.remove({ userId: 'u1', id: 'f-1' })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('keeps a followed target that is also a favourite, only unfollowing it', async () => {
    const { service, prisma } = createService();

    prisma.follow.deleteMany.mockResolvedValue({ count: 0 });
    prisma.follow.updateMany.mockResolvedValue({ count: 1 });

    await service.remove({ userId: 'u1', id: 'f-1' });

    expect(prisma.follow.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'f-1', userId: 'u1', isFollowing: true }, data: expect.objectContaining({ isFollowing: false }) })
    );
  });
});
