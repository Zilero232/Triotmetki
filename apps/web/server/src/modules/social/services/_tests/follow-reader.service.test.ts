import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Follow, Player } from '../../../../../generated';
import type { UserLestaAccountsService } from '../../../../core';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { FollowReaderService } from '../follow-reader.service';

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
  const accounts = mock<UserLestaAccountsService>();

  prisma.follow.findMany.mockResolvedValue([]);
  prisma.player.findMany.mockResolvedValue([]);
  accounts.accountIds.mockResolvedValue([]);

  return { service: new FollowReaderService(prisma, accounts), prisma, accounts };
};

describe('FollowReaderService.list', () => {
  it('lists only rows that are followed, not bare favourites', async () => {
    const { service, prisma } = createService();

    await service.list('u1');

    expect(prisma.follow.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1', isFollowing: true } }));
  });
});

describe('FollowReaderService.circle', () => {
  it('merges own accounts with followed players without duplicates', async () => {
    const { service, prisma, accounts } = createService();

    prisma.follow.findMany.mockResolvedValue([follow(2n), follow(3n)]);
    accounts.accountIds.mockResolvedValue([1n, 2n]);

    const circle = await service.circle('u1');

    expect(circle.accountIds.toSorted()).toEqual([1n, 2n, 3n]);
    expect(circle.own).toEqual(new Set([1n, 2n]));
  });

  it('leaves a player who asked for deletion out of the circle', async () => {
    const { service, prisma, accounts } = createService();

    prisma.follow.findMany.mockResolvedValue([follow(2n), follow(3n)]);
    accounts.accountIds.mockResolvedValue([1n]);
    prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: 3n })]);

    const circle = await service.circle('u1');

    expect(circle.accountIds.toSorted()).toEqual([1n, 2n]);
    expect(prisma.player.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: { in: [1n, 2n, 3n] }, isHidden: true } }));
  });

  it('only follows of players widen the circle', async () => {
    const { service, prisma } = createService();

    await service.circle('u1');

    expect(prisma.follow.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1', kind: 'player', isFollowing: true } }));
  });
});
