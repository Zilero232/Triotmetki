import type { Cache } from 'cache-manager';

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { indexBy, unique } from 'remeda';

import type { ModOverview, ModTankRatings, TankRatingsInput } from '../mod.types';
import type { ModRatingsQueries } from '../queries/ratings.types';

import { bonusTypesOfMode, toNumber } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { ExpectedValuesService } from '../../reference';
import { MOD_RATINGS_READ } from '../config/ratings.constants';
import { MOD_TOKENS } from '../config/tokens.constants';
import { toModOverview, toModTankRating } from '../mappers/ratings.mappers';
import {
  LATEST_SESSION_ORDER,
  LATEST_SESSION_SELECT,
  OVERALL_RATING_SELECT,
  OWN_TANK_SELECT,
  TANK_RATING_SELECT,
  TANK_TOTALS_SELECT
} from '../selects/ratings.selects';

@Injectable()
export class ModRatingsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expectedValues: ExpectedValuesService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    @Inject(MOD_TOKENS.ratingsQueries) private readonly queries: ModRatingsQueries
  ) {}

  async overview(accountId: bigint): Promise<ModOverview> {
    const key = `${MOD_RATINGS_READ.overviewKey}${accountId}`;
    const hit = await this.cache.get<ModOverview>(key);

    if (hit) {
      return hit;
    }

    const [rating, live] = await Promise.all([
      this.prisma.accountRating.findUnique({
        where: { accountId_period: { accountId, period: MOD_RATINGS_READ.period } },
        select: OVERALL_RATING_SELECT
      }),
      this.prisma.playSession.findFirst({ where: { accountId, kind: 'live' }, orderBy: LATEST_SESSION_ORDER, select: LATEST_SESSION_SELECT })
    ]);

    const session =
      live ??
      (await this.prisma.playSession.findFirst({ where: { accountId, kind: 'day' }, orderBy: LATEST_SESSION_ORDER, select: LATEST_SESSION_SELECT }));

    const overview = toModOverview({ accountId, rating, session });

    await this.cache.set(key, overview, MOD_RATINGS_READ.cacheTtlMs);

    return overview;
  }

  async tanks({ accountId, tankIds }: TankRatingsInput): Promise<ModTankRatings> {
    const ids = unique(tankIds);
    const key = `${MOD_RATINGS_READ.tanksKey}${accountId}:${[...ids].sort((left, right) => left - right).join(',')}`;
    const hit = await this.cache.get<ModTankRatings>(key);

    if (hit) {
      return hit;
    }

    const where = { accountId, tankId: { in: ids } };

    const [tanks, ratings, totals, records, expected] = await Promise.all([
      this.prisma.playerTank.findMany({ where, select: OWN_TANK_SELECT }),
      this.prisma.accountTankRating.findMany({ where: { ...where, period: MOD_RATINGS_READ.period }, select: TANK_RATING_SELECT }),
      this.prisma.tankSnapshotLatest.findMany({ where: { ...where, mode: MOD_RATINGS_READ.statsMode }, select: TANK_TOTALS_SELECT }),
      this.queries.tankRecords({
        db: this.prisma.$kysely,
        accountId: Number(accountId),
        tankIds: ids,
        battleTypes: bonusTypesOfMode(MOD_RATINGS_READ.statsMode)
      }),
      this.expectedValues.all()
    ]);

    const tankOf = indexBy(tanks, (row) => row.tankId);
    const ratingOf = indexBy(ratings, (row) => row.tankId);
    const totalsOf = indexBy(totals, (row) => row.tankId);
    const recordsOf = indexBy(records, (row) => row.tankId);

    const result: ModTankRatings = {
      account_id: toNumber(accountId),
      tanks: ids.flatMap((tankId) => {
        const row = toModTankRating({
          tankId,
          tank: tankOf[tankId],
          rating: ratingOf[tankId],
          totals: totalsOf[tankId],
          records: recordsOf[tankId],
          expected: expected.get(tankId)
        });

        return row ? [row] : [];
      })
    };

    await this.cache.set(key, result, MOD_RATINGS_READ.cacheTtlMs);

    return result;
  }
}
