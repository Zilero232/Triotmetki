import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { isNonNullish, unique, uniqueBy } from 'remeda';

import type { WatermarkBatch } from '../../../core';
import type { MarkBattle } from '../lib/mark-gains';
import type { PreviousMarksInput } from '../notifications.types';
import type { MarksWatchQueries } from '../queries/marks-watch.types';
import type { MarkBattleRow } from '../selects/marks-watch.selects';

import { advanceWatermark, PrismaService, REDIS } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { NOTIFICATION_TOKENS } from '../config/tokens.constants';
import { MARKS_WATCH } from '../config/watchers.constants';
import { detectMarkGains, markPairKey } from '../lib/mark-gains';
import { MARK_BATTLE_SELECT } from '../selects/marks-watch.selects';
import { NotificationService } from './notification.service';

@Injectable()
export class MarksWatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly notifications: NotificationService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(NOTIFICATION_TOKENS.marksWatchQueries) private readonly queries: MarksWatchQueries
  ) {}

  run(): Promise<number> {
    return advanceWatermark({
      redis: this.redis,
      key: MARKS_WATCH.cursorKey,
      now: new Date(),
      fetch: (since) => this.battlesSince(since),
      process: (batch) => this.processBatch(batch)
    });
  }

  private battlesSince(since: Date) {
    return this.prisma.battle.findMany({
      where: { receivedAt: { gt: since }, marksOnGun: { not: null } },
      orderBy: { receivedAt: 'asc' },
      take: MARKS_WATCH.batchSize,
      select: MARK_BATTLE_SELECT
    });
  }

  private async processBatch({ rows, since }: WatermarkBatch<MarkBattleRow>): Promise<number> {
    const battles: MarkBattle[] = rows.flatMap((row) => (row.marksOnGun === null ? [] : [{ ...row, marksOnGun: row.marksOnGun }]));
    const previous = await this.previousMarks({ battles, since });
    const gains = detectMarkGains({ battles, previous });

    if (gains.length > 0) {
      await this.announce(gains);
    }

    return gains.length;
  }

  private async previousMarks({ battles, since }: PreviousMarksInput): Promise<Map<string, number>> {
    const pairs = uniqueBy(battles, markPairKey);

    const [earlier, tanks] = await Promise.all([
      this.queries.previousBattleMarks({ db: this.prisma.$kysely, battleIds: battles.map((battle) => battle.id), since }),
      this.prisma.playerTank.findMany({
        where: { OR: pairs.map(({ accountId, tankId }) => ({ accountId, tankId })) },
        select: { accountId: true, tankId: true, marksOnGun: true }
      })
    ]);

    const fromBattles = new Map(earlier.map((row) => [markPairKey({ accountId: BigInt(row.accountId), tankId: row.tankId }), row.marksOnGun]));
    const fromTanks = new Map(tanks.map((tank) => [markPairKey(tank), tank.marksOnGun]));

    return new Map(
      pairs.flatMap((pair) => {
        const key = markPairKey(pair);
        const marks = fromBattles.get(key) ?? fromTanks.get(key) ?? null;

        return isNonNullish(marks) ? [[key, marks] as const] : [];
      })
    );
  }

  private async announce(gains: readonly MarkBattle[]): Promise<void> {
    const players = await this.prisma.player.findMany({
      where: { accountId: { in: unique(gains.map((gain) => gain.accountId)) } },
      select: { accountId: true, nickname: true }
    });

    const nicknames = new Map(players.map((player) => [player.accountId, player.nickname]));

    for (const gain of gains) {
      const vehicle = await this.catalog.summary(gain.tankId);

      await this.notifications.notifyAccount({
        accountId: gain.accountId,
        notification: {
          event: 'moeGained',
          accountId: Number(gain.accountId),
          nickname: nicknames.get(gain.accountId) ?? String(gain.accountId),
          tankId: gain.tankId,
          tankName: vehicle.shortName || vehicle.name,
          marks: gain.marksOnGun
        },
        dedupeKey: `moe-${gain.id}`
      });
    }
  }
}
