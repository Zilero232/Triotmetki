import type { StreamerCard, StreamerLive } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { groupBy, indexBy, unique } from 'remeda';

import type { StreamerProfile } from '../../../../../generated';
import type { ProfileCardRow } from '../selects/profile-card.types';

import { toIso, toNumber } from '../../../../common/lib';
import { PrismaService } from '../../../../core';
import { STREAMERS } from '../config/directory.constants';
import { toStreamerCard } from '../mappers/streamer-card.mappers';

@Injectable()
export class StreamerCardsReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async live(profile: StreamerProfile): Promise<StreamerLive | null> {
    if (!profile.isLive || !profile.livePlatform) {
      return null;
    }

    const tank = profile.liveTankId ? await this.prisma.vehicle.findUnique({ where: { tankId: profile.liveTankId }, select: { name: true } }) : null;

    return {
      platform: profile.livePlatform,
      viewers: profile.liveViewers,
      tankId: profile.liveTankId,
      tankName: tank?.name ?? null,
      checkedAt: toIso(profile.liveCheckedAt)
    };
  }

  async cards(profiles: readonly ProfileCardRow[]): Promise<StreamerCard[]> {
    const accountIds = unique(profiles.flatMap((profile) => (profile.accountId === null ? [] : [profile.accountId])));

    const [ratings, marks, tanks] = await Promise.all([
      this.prisma.accountRating.findMany({ where: { accountId: { in: accountIds }, period: 'overall' } }),
      this.prisma.playerTank.groupBy({ by: ['accountId'], where: { accountId: { in: accountIds }, marksOnGun: 3 }, _count: { _all: true } }),
      this.prisma.playerTank.findMany({
        where: { accountId: { in: accountIds }, battles: { gt: 0 } },
        orderBy: { battles: 'desc' },
        select: { accountId: true, tankId: true, battles: true }
      })
    ]);

    const tankGroups = groupBy(tanks, (tank) => String(tank.accountId));
    const favourites = Object.fromEntries(
      Object.entries(tankGroups).map(([accountId, rows]) => [accountId, rows.slice(0, STREAMERS.favouriteTanks)])
    );

    const tankIds = unique([
      ...Object.values(favourites).flatMap((rows) => rows.map((row) => row.tankId)),
      ...profiles.flatMap((profile) => (profile.liveTankId ? [profile.liveTankId] : []))
    ]);

    const vehicles = indexBy(
      await this.prisma.vehicle.findMany({ where: { tankId: { in: tankIds } }, select: { tankId: true, name: true } }),
      (vehicle) => String(vehicle.tankId)
    );

    const ratingOf = indexBy(ratings, (rating) => String(rating.accountId));
    const marksOf = indexBy(marks, (row) => String(row.accountId));

    return profiles.map((profile) => {
      const key = profile.accountId === null ? null : String(profile.accountId);

      return toStreamerCard({
        profile,
        rating: key ? ratingOf[key] : undefined,
        marks3: key ? (marksOf[key]?._count._all ?? 0) : null,
        favourites: key ? (favourites[key] ?? []) : [],
        vehicles
      });
    });
  }

  accountIdOf(profile: StreamerProfile): number | null {
    return profile.accountId === null ? null : toNumber(profile.accountId);
  }
}
