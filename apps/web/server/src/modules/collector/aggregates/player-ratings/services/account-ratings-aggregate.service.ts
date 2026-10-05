import { Inject, Injectable } from '@nestjs/common';
import { uniqueBy } from 'remeda';

import type { AccountRatingsPayload } from '../../../contracts';
import type { TankSnapshotTotals } from '../lib/account-ratings';
import type { PlayerRatingsQueries } from '../player-ratings.types';
import type { RatingMode, TankHistoryInput } from './account-ratings-aggregate.types';

import { asPrismaTransaction, PrismaService } from '../../../../../core';
import { PLAYER_RATINGS_AGGREGATE } from '../config/player-ratings.constants';
import { PLAYER_RATINGS_TOKENS } from '../config/tokens.constants';
import { buildAccountRatings, earliestCutoff, ratingHistoryBounds } from '../lib/account-ratings';
import { TANK_TOTALS_SELECT } from '../selects/tank-totals.selects';
import { ReferenceTablesService } from './reference-tables.service';

@Injectable()
export class AccountRatingsAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tables: ReferenceTablesService,
    @Inject(PLAYER_RATINGS_TOKENS.queries) private readonly queries: PlayerRatingsQueries
  ) {}

  async compute({ accountId }: AccountRatingsPayload) {
    const id = BigInt(accountId);
    const player = await this.prisma.player.findUnique({ where: { accountId: id }, select: { accountId: true } });

    if (!player) {
      return { skipped: true };
    }

    const mode = await this.ratingMode(id);

    if (!mode) {
      return { skipped: true };
    }

    const now = new Date();
    const db = this.prisma.$kysely;
    const accountSnapshots = await this.queries.accountSnapshotWindow({ db, accountId, mode, ...ratingHistoryBounds(now) });
    const cutoff = earliestCutoff({ accountSnapshots, now });

    const [history, latest, tables] = await Promise.all([
      cutoff ? this.tankHistory({ accountId, mode, cutoff }) : Promise.resolve([]),
      this.prisma.tankSnapshotLatest.findMany({ where: { accountId: id, mode }, select: TANK_TOTALS_SELECT }),
      this.tables.tables()
    ]);

    const tankSnapshots = uniqueBy([...history, ...latest], (row) => `${row.tankId}:${row.capturedAt.getTime()}`);
    const { ratings, tankRatings } = buildAccountRatings({ accountId: id, accountSnapshots, tankSnapshots, ...tables, now });

    await this.prisma.$transaction(async (tx) => {
      const { $kysely } = asPrismaTransaction(tx);

      await this.queries.replaceAccountRatings({ db: $kysely, accountId, rows: ratings });
      await this.queries.replaceAccountTankRatings({ db: $kysely, accountId, rows: tankRatings });
    });

    return { mode, periods: ratings.length, tanks: tankRatings.length };
  }

  private async tankHistory({ accountId, mode, cutoff }: TankHistoryInput): Promise<TankSnapshotTotals[]> {
    const [recent, boundary] = await Promise.all([
      this.prisma.tankSnapshot.findMany({ where: { accountId: BigInt(accountId), mode, capturedAt: { gt: cutoff } }, select: TANK_TOTALS_SELECT }),
      this.queries.tankBoundary({ db: this.prisma.$kysely, accountId, mode, cutoff })
    ]);

    return [...boundary, ...recent];
  }

  private async ratingMode(accountId: bigint): Promise<RatingMode | null> {
    for (const mode of PLAYER_RATINGS_AGGREGATE.ratingModes) {
      const exists = await this.prisma.tankSnapshotLatest.findFirst({ where: { accountId, mode }, select: { tankId: true } });

      if (exists) {
        return mode;
      }
    }

    return null;
  }
}
