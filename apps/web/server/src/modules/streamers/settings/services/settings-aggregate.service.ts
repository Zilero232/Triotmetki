import type { SettingsAggregates, SettingsCohort, SettingsValues } from '@otmetki/schemas';

import { Injectable, Logger } from '@nestjs/common';
import { RATING_SCALES, RATING_TIERS } from '@otmetki/ratings';
import { settingsValuesSchema, STREAMER_SETTINGS, streamerSettingsSchema, toSettingsValues } from '@otmetki/schemas';
import { groupBy } from 'remeda';

import { Prisma } from '../../../../../generated';
import { toIso } from '../../../../common/lib';
import { PrismaService } from '../../../../core';
import { aggregateCohort } from '../lib/settings-aggregate/settings-aggregate';

@Injectable()
export class SettingsAggregateService {
  private readonly logger = new Logger(SettingsAggregateService.name);

  constructor(private readonly prisma: PrismaService) {}

  async read(cohort: SettingsCohort): Promise<SettingsAggregates> {
    const rows = await this.prisma.settingsAggregate.findMany({ where: { cohort }, orderBy: [{ field: 'asc' }, { count: 'desc' }] });
    const fields = Object.entries(groupBy(rows, (row) => row.field)).map(([field, buckets]) => {
      const [first] = buckets;

      return {
        field,
        kind: first?.median === null ? ('categorical' as const) : ('numeric' as const),
        contributors: first?.contributors ?? 0,
        median: first?.median ?? null,
        buckets: buckets.map((row) => ({ bucket: row.bucket, count: row.count }))
      };
    });

    return { cohort, minCohort: STREAMER_SETTINGS.minCohort, computedAt: toIso(rows[0]?.computedAt), fields };
  }

  async compute(): Promise<number> {
    const [creators, shares] = await Promise.all([this.creatorValues(), this.shareValues()]);
    const cohorts: Record<SettingsCohort, SettingsValues[]> = {
      creators,
      top: shares.top,
      all: [...creators, ...shares.all]
    };

    const computedAt = new Date();
    let written = 0;

    for (const cohort of STREAMER_SETTINGS.cohorts) {
      const rows = aggregateCohort({ contributions: cohorts[cohort], minCohort: STREAMER_SETTINGS.minCohort });
      const data = rows.flatMap((row) =>
        row.buckets.map((bucket) => ({
          cohort,
          field: row.field,
          bucket: bucket.bucket,
          count: bucket.count,
          contributors: row.contributors,
          median: row.kind === 'numeric' ? row.median : null,
          computedAt
        }))
      );

      await this.prisma.$transaction([
        this.prisma.settingsAggregate.deleteMany({ where: { cohort } }),
        this.prisma.settingsAggregate.createMany({ data })
      ]);

      written += data.length;
    }

    this.logger.log(`settings aggregates: ${written} buckets`);

    return written;
  }

  private async creatorValues(): Promise<SettingsValues[]> {
    const rows = await this.prisma.streamerProfile.findMany({
      where: { hiddenAt: null, kind: 'claimed', settings: { not: Prisma.DbNull } },
      select: { settings: true }
    });

    return rows.flatMap((row) => {
      const parsed = streamerSettingsSchema.safeParse(row.settings);

      return parsed.success ? [toSettingsValues(parsed.data)] : [];
    });
  }

  private async shareValues(): Promise<{ top: SettingsValues[]; all: SettingsValues[] }> {
    const shares = await this.prisma.playerSettingsShare.findMany({ where: { anonymousStats: true }, select: { accountId: true, data: true } });
    const accountIds = shares.flatMap((share) => (share.accountId === null ? [] : [share.accountId]));
    const unicum = RATING_SCALES.wn8[RATING_TIERS.indexOf('unicum')] ?? 0;
    const tops = await this.prisma.accountRating.findMany({
      where: { accountId: { in: accountIds }, period: 'overall', wn8: { gte: unicum } },
      select: { accountId: true }
    });

    const topIds = new Set(tops.map((row) => String(row.accountId)));
    const parsed = shares.flatMap((share) => {
      const values = settingsValuesSchema.safeParse(share.data);

      return values.success ? [{ accountId: share.accountId, values: values.data }] : [];
    });

    return {
      top: parsed.filter((share) => share.accountId !== null && topIds.has(String(share.accountId))).map((share) => share.values),
      all: parsed.map((share) => share.values)
    };
  }
}
