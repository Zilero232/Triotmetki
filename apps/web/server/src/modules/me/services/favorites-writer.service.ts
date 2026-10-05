import { Injectable } from '@nestjs/common';

import type { CreateFavoriteInput, Favorite, OwnedInput } from '../me.types';

import { AppConflictException, AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { CollectorProducerService } from '../../collector';
import { VehicleCatalogService } from '../../reference';
import { clearFollowFlag, setFollowFlag } from '../../social';
import { FAVORITES } from '../config/me.constants';
import { toFavorite } from '../mappers/favorites.mappers';

@Injectable()
export class FavoritesWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly collector: CollectorProducerService
  ) {}

  async list(userId: string): Promise<Favorite[]> {
    const rows = await this.prisma.follow.findMany({ where: { userId, isFavorite: true }, orderBy: { createdAt: 'desc' } });
    const ids = (kind: string) => rows.filter((row) => row.kind === kind).map((row) => row.targetId);

    const [players, clans, catalog] = await Promise.all([
      this.prisma.player.findMany({ where: { accountId: { in: ids('player') } }, select: { accountId: true, nickname: true } }),
      this.prisma.clan.findMany({ where: { clanId: { in: ids('clan') } }, select: { clanId: true, tag: true } }),
      this.catalog.all()
    ]);

    const nicknameOf = new Map(players.map((player) => [player.accountId, player.nickname]));
    const tagOf = new Map(clans.map((clan) => [clan.clanId, clan.tag]));

    return rows.map((row) => toFavorite({ row, nicknameOf, tagOf, catalog }));
  }

  async create({ userId, kind, targetId, label, isOwn }: CreateFavoriteInput): Promise<Favorite> {
    const key = { userId, kind, targetId: BigInt(targetId) };
    const existing = await this.prisma.follow.findUnique({ where: { userId_kind_targetId: key }, select: { isFavorite: true } });

    if (!existing?.isFavorite && (await this.prisma.follow.count({ where: { userId, isFavorite: true } })) >= FAVORITES.maxCount) {
      throw new AppConflictException('CONFLICT', `At most ${FAVORITES.maxCount} favourites`);
    }

    await setFollowFlag({ prisma: this.prisma, flag: 'isFavorite', key, data: { label: label ?? null, isOwn: isOwn ?? false } });

    if (kind === 'player') {
      await this.collector.enrol({ accountId: targetId, priority: 'high', reason: 'favorite' });
    }

    const favorites = await this.list(userId);
    const created = favorites.find((favorite) => favorite.kind === kind && favorite.targetId === targetId);

    if (!created) {
      throw new AppNotFoundException('NOT_FOUND', 'Favourite not found');
    }

    return created;
  }

  async remove({ userId, id }: OwnedInput): Promise<void> {
    const removed = await clearFollowFlag({ prisma: this.prisma, flag: 'isFavorite', where: { id, userId } });

    if (!removed) {
      throw new AppNotFoundException('NOT_FOUND', 'Favourite not found');
    }
  }
}
