import type { MoeHistoryBatch, MoeQuery, MoeRow, MoeThreshold, Paginated } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { match } from 'ts-pattern';

import type { MoeHistoryBatchInput, MoeHistoryInput } from '../marks.types';

import { page, sortRows } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { ThresholdsService, toMasteryThreshold, toMoeThreshold, toMoeThresholdRecord, VehicleCatalogService } from '../../reference';
import { MOE_TABLE } from '../config/marks.constants';
import { historySeries } from '../lib/moe-history/moe-history';
import { EMPTY_SWEAT } from '../lib/sweat-index/sweat-index';
import { toHistorySourceRow } from '../mappers/moe-history.mappers';
import { SweatIndexService } from './sweat-index.service';

@Injectable()
export class MoeTableService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly thresholds: ThresholdsService,
    private readonly catalog: VehicleCatalogService,
    private readonly sweat: SweatIndexService
  ) {}

  async table(query: MoeQuery): Promise<Paginated<MoeRow>> {
    const now = new Date();

    const [current, week, month, eligible, sweat] = await Promise.all([
      this.thresholds.latest(query.source),
      this.thresholds.asOf({ date: subDays(now, MOE_TABLE.trendDays.week), source: query.source }),
      this.thresholds.asOf({ date: subDays(now, MOE_TABLE.trendDays.month), source: query.source }),
      this.catalog.filter(query),
      this.sweat.all()
    ]);

    const needle = query.search?.toLocaleLowerCase('ru');

    const rows = eligible
      .filter((entry) => entry.summary.tier >= MOE_TABLE.minTier)
      .filter(
        (entry) =>
          !needle || entry.summary.name.toLocaleLowerCase('ru').includes(needle) || entry.summary.shortName.toLocaleLowerCase('ru').includes(needle)
      )
      .map((entry): MoeRow => {
        const { tankId } = entry.summary;
        const moe = current.moe.get(tankId);
        const mastery = current.mastery.get(tankId);
        const weekAgo = week.moe.get(tankId);
        const monthAgo = month.moe.get(tankId);

        return {
          vehicle: entry.summary,
          moe: moe ? toMoeThreshold(moe) : null,
          mastery: mastery ? toMasteryThreshold(mastery) : null,
          trend: {
            p95Delta7d: moe && weekAgo ? moe.p95 - weekAgo.p95 : null,
            p95Delta30d: moe && monthAgo ? moe.p95 - monthAgo.p95 : null
          },
          sweat: sweat.get(tankId) ?? EMPTY_SWEAT,
          updatedAt: moe ? moe.capturedAt.toISOString() : null
        };
      });

    const sorted = sortRows({
      rows,
      order: query.order,
      value: (row) =>
        match(query.sort ?? 'tier')
          .with('p65', () => row.moe?.p65 ?? null)
          .with('p85', () => row.moe?.p85 ?? null)
          .with('p95', () => row.moe?.p95 ?? null)
          .with('p100', () => row.moe?.p100 ?? null)
          .with('master', () => row.mastery?.master ?? null)
          .with('tier', () => row.vehicle.tier)
          .with('p95Delta30d', () => row.trend.p95Delta30d)
          .with('p95Change30d', () => (row.trend.p95Delta30d === null ? null : Math.abs(row.trend.p95Delta30d)))
          .with('sweat', () => row.sweat.moe)
          .with('masterySweat', () => row.sweat.mastery)
          .exhaustive()
    });

    return page({ items: sorted, limit: query.limit, offset: query.offset });
  }

  async history({ tankId, from, to, source }: MoeHistoryInput): Promise<MoeThreshold[]> {
    const rows = await this.thresholds.moeHistory({
      tankId,
      source,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined
    });

    return rows.map(toMoeThreshold);
  }

  async historyBatch({ tankIds, days, source }: MoeHistoryBatchInput): Promise<MoeHistoryBatch> {
    const rows = await this.prisma.tankThreshold.findMany({
      where: { kind: 'moe', tankId: { in: tankIds }, date: { gte: subDays(new Date(), days) }, ...(source ? { source } : {}) },
      orderBy: { date: 'asc' }
    });

    return {
      days,
      series: historySeries({
        tankIds,
        rows: rows.map(toMoeThresholdRecord).map(toHistorySourceRow)
      })
    };
  }
}
