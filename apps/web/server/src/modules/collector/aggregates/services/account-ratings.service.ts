import { Injectable } from '@nestjs/common';
import { uniqueBy } from 'remeda';

import type { StatsMode } from '../../../../../generated';
import type { AccountRatingsPayload } from '../../contracts';
import type { TankSnapshotTotals } from '../lib/account-ratings';
import type { AccountSnapshotPointRow, TankBoundarySqlInput } from '../queries';

import { PrismaService } from '../../../../core';
import { AGGREGATES } from '../config';
import { buildAccountRatings, earliestCutoff, ratingHistoryBounds } from '../lib/account-ratings';
import { accountSnapshotWindowSql, replaceAccountRatingsSql, replaceAccountTankRatingsSql, tankBoundarySql } from '../queries';
import { TANK_TOTALS_SELECT } from '../selects';
import { ReferenceTablesService } from './reference-tables.service';

@Injectable()
export class AccountRatingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tables: ReferenceTablesService
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
    const accountSnapshots = await this.prisma.$queryRaw<AccountSnapshotPointRow[]>(
      accountSnapshotWindowSql({ accountId: id, mode, ...ratingHistoryBounds(now) })
    );

    const cutoff = earliestCutoff({ accountSnapshots, now });

    const [history, latest, tables] = await Promise.all([
      cutoff ? this.tankHistory({ accountId: id, mode, cutoff }) : Promise.resolve([]),
      this.prisma.tankSnapshotLatest.findMany({ where: { accountId: id, mode }, select: TANK_TOTALS_SELECT }),
      this.tables.tables()
    ]);

    const tankSnapshots = uniqueBy([...history, ...latest], (row) => `${row.tankId}:${row.capturedAt.getTime()}`);
    const { ratings, tankRatings } = buildAccountRatings({ accountId: id, accountSnapshots, tankSnapshots, ...tables, now });

    await this.prisma.$transaction([
      this.prisma.$executeRaw(replaceAccountRatingsSql({ accountId: id, rows: ratings })),
      this.prisma.$executeRaw(replaceAccountTankRatingsSql({ accountId: id, rows: tankRatings }))
    ]);

    return { mode, periods: ratings.length, tanks: tankRatings.length };
  }

  private async tankHistory({ accountId, mode, cutoff }: TankBoundarySqlInput): Promise<TankSnapshotTotals[]> {
    const [recent, boundary] = await Promise.all([
      this.prisma.tankSnapshot.findMany({ where: { accountId, mode, capturedAt: { gt: cutoff } }, select: TANK_TOTALS_SELECT }),
      this.prisma.$queryRaw<TankSnapshotTotals[]>(tankBoundarySql({ accountId, mode, cutoff }))
    ]);

    return [...boundary, ...recent];
  }

  private async ratingMode(accountId: bigint): Promise<StatsMode | null> {
    for (const mode of AGGREGATES.ratingModes) {
      const exists = await this.prisma.tankSnapshotLatest.findFirst({ where: { accountId, mode }, select: { tankId: true } });

      if (exists) {
        return mode;
      }
    }

    return null;
  }
}
