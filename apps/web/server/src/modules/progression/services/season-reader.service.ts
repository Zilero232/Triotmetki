import type { SeasonHistory, SeasonTrack } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { SEASON_HISTORY, SEASON_TRACK, seasonLevelOf, seasonOf } from '@otmetki/schemas';

import type { UserAtInput } from '../progression.types';

import { PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { seasonRewardViews } from '../lib/season-rewards/season-rewards';

@Injectable()
export class SeasonReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService
  ) {}

  async track({ userId, now }: UserAtInput): Promise<SeasonTrack> {
    const season = seasonOf(now);
    const [row, isPlus] = await Promise.all([
      this.prisma.seasonProgress.findUnique({ where: { userId_season: { userId, season: season.code } }, select: { points: true } }),
      this.entitlements.isPlus(userId)
    ]);

    const points = row?.points ?? 0;
    const { level, levelPoints, nextLevelPoints } = seasonLevelOf(points);

    return {
      season: { code: season.code, startsAt: season.startsAt.toISOString(), endsAt: season.endsAt.toISOString() },
      isAccruing: isPlus,
      points,
      level,
      maxLevel: SEASON_TRACK.maxLevel,
      levelPoints,
      nextLevelPoints,
      rewards: seasonRewardViews({ season: season.code, level })
    };
  }

  async history(accountId: number): Promise<SeasonHistory> {
    const link = await this.prisma.userLestaAccount.findUnique({ where: { accountId: BigInt(accountId) }, select: { userId: true } });

    if (!link) {
      return { items: [] };
    }

    const rows = await this.prisma.seasonProgress.findMany({
      where: { userId: link.userId, points: { gt: 0 } },
      orderBy: { season: 'desc' },
      take: SEASON_HISTORY.limit
    });

    return { items: rows.map((row) => ({ season: row.season, points: row.points, level: seasonLevelOf(row.points).level })) };
  }
}
