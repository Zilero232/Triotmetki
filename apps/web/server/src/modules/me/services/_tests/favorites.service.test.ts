import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Clan, Follow, Player } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { CollectorProducerService } from '../../../collector';
import type { VehicleCatalogService } from '../../../reference';

import { AppConflictException, AppNotFoundException } from '../../../../common/exceptions';
import { unknownVehicle } from '../../../reference';
import { FAVORITES } from '../../config';
import { FavoritesService } from '../favorites.service';

const CREATED_AT = new Date('2026-09-01T00:00:00.000Z');

const favorite = (kind: Follow['kind'], targetId: bigint): Follow =>
  mock<Follow>({ id: `${kind}-${targetId}`, kind, targetId, isFavorite: true, isFollowing: false, label: null, isOwn: false, createdAt: CREATED_AT });

const createService = (rows: Follow[] = []) => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();
  const collector = mock<CollectorProducerService>();

  prisma.follow.findMany.mockResolvedValue(rows);
  prisma.follow.count.mockResolvedValue(rows.length);
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.player.findMany.mockResolvedValue([]);
  prisma.clan.findMany.mockResolvedValue([]);

  catalog.all.mockResolvedValue(
    new Map([
      [
        1,
        {
          summary: { ...unknownVehicle(1), name: 'IS-7' },
          dbType: 'heavyTank',
          specs: null,
          description: null,
          role: null,
          spec: { tags: [], role: null, notInShop: false },
          hasOffers: false
        }
      ]
    ])
  );

  return { service: new FavoritesService(prisma, catalog, collector), prisma, collector };
};

describe('FavoritesService.list', () => {
  it('titles players by nickname, clans by tag and tanks by name', async () => {
    const { service, prisma } = createService([favorite('player', 7n), favorite('clan', 8n), favorite('tank', 1n)]);

    prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: 7n, nickname: 'Tanker' })]);
    prisma.clan.findMany.mockResolvedValue([mock<Clan>({ clanId: 8n, tag: 'TAG' })]);

    const titles = (await service.list('user')).map((entry) => entry.title);

    expect(titles).toEqual(['Tanker', 'TAG', 'IS-7']);
  });

  it('leaves the title empty for targets that no longer exist', async () => {
    const { service } = createService([favorite('player', 7n), favorite('clan', 8n), favorite('tank', 99n)]);

    expect((await service.list('user')).map((entry) => entry.title)).toEqual([null, null, null]);
  });

  it('lists only favourites, not bare follows', async () => {
    const { service, prisma } = createService();

    await service.list('user');

    expect(prisma.follow.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user', isFavorite: true } }));
  });
});

describe('FavoritesService.create', () => {
  it('refuses a new favourite at the limit', async () => {
    const { service, prisma } = createService();

    prisma.follow.count.mockResolvedValue(FAVORITES.maxCount);

    await expect(service.create({ userId: 'user', kind: 'tank', targetId: 1 })).rejects.toBeInstanceOf(AppConflictException);
    expect(prisma.follow.upsert).not.toHaveBeenCalled();
    expect(prisma.follow.count).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'user', isFavorite: true } }));
  });

  it('favourites a followed target as a new favourite without unfollowing it', async () => {
    const { service, prisma } = createService([favorite('player', 7n)]);

    prisma.follow.findUnique.mockResolvedValue({ ...favorite('player', 7n), isFavorite: false, isFollowing: true });

    await service.create({ userId: 'user', kind: 'player', targetId: 7 });

    expect(prisma.follow.count).toHaveBeenCalled();

    expect(prisma.follow.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ isFavorite: true, isFollowing: false }),
        update: { isFavorite: true, label: null, isOwn: false }
      })
    );
  });

  it('still updates the label of an existing favourite at the limit', async () => {
    const { service, prisma } = createService([favorite('tank', 1n)]);

    prisma.follow.count.mockResolvedValue(FAVORITES.maxCount);
    prisma.follow.findUnique.mockResolvedValue(favorite('tank', 1n));

    await expect(service.create({ userId: 'user', kind: 'tank', targetId: 1, label: 'main' })).resolves.toMatchObject({ kind: 'tank', targetId: 1 });
    expect(prisma.follow.upsert).toHaveBeenCalled();
  });

  it('enrols a favourite player for tracking with high priority', async () => {
    const { service, collector } = createService([favorite('player', 7n)]);

    await service.create({ userId: 'user', kind: 'player', targetId: 7 });

    expect(collector.enrol).toHaveBeenCalledWith(expect.objectContaining({ accountId: 7, priority: 'high' }));
  });

  it('does not enrol clans or tanks', async () => {
    const { service, collector } = createService([favorite('tank', 1n)]);

    await service.create({ userId: 'user', kind: 'tank', targetId: 1 });

    expect(collector.enrol).not.toHaveBeenCalled();
  });
});

describe('FavoritesService.remove', () => {
  it('answers 404 when the favourite is not the user’s', async () => {
    const { service, prisma } = createService();

    prisma.follow.deleteMany.mockResolvedValue({ count: 0 });
    prisma.follow.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.remove({ userId: 'user', id: 'other' })).rejects.toBeInstanceOf(AppNotFoundException);

    expect(prisma.follow.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'other', userId: 'user', isFavorite: true, isFollowing: false } })
    );
  });

  it('keeps a favourite that is also followed, clearing only the favourite', async () => {
    const { service, prisma } = createService();

    prisma.follow.deleteMany.mockResolvedValue({ count: 0 });
    prisma.follow.updateMany.mockResolvedValue({ count: 1 });

    await expect(service.remove({ userId: 'user', id: 'f1' })).resolves.toBeUndefined();

    expect(prisma.follow.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'f1', userId: 'user', isFavorite: true }, data: expect.objectContaining({ isFavorite: false }) })
    );
  });
});
