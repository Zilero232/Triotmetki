import { Inject, Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';
import { isNonNull } from 'remeda';

import type { ThresholdSource } from '../../../../generated';
import type { ThresholdsQueries } from '../queries/thresholds.types';
import type { MasteryThresholdRecord, MoeHistoryInput, MoeThresholdRecord, ThresholdsAsOfInput, ThresholdSet } from '../reference.types';

import { PrismaService } from '../../../core';
import { CATALOG } from '../config/catalog.constants';
import { REFERENCE_QUERY_TOKENS } from '../config/queries.constants';
import { preferredBySource } from '../lib/thresholds/thresholds';
import { toMasteryThresholdRecord, toMoeThresholdRecord } from '../mappers/threshold-record.mappers';

@Injectable()
export class ThresholdsService {
  private readonly cache = new LRUCache<string, ThresholdSet, ThresholdSource | undefined>({
    max: CATALOG.thresholdKeys,
    ttl: CATALOG.ttlMs,
    fetchMethod: (_key, _stale, { context }) => this.asOf({ date: null, source: context })
  });

  constructor(
    private readonly prisma: PrismaService,
    @Inject(REFERENCE_QUERY_TOKENS.thresholds) private readonly queries: ThresholdsQueries
  ) {}

  async moe(tankId: number): Promise<MoeThresholdRecord | null> {
    const { moe } = await this.latest();

    return moe.get(tankId) ?? null;
  }

  async mastery(tankId: number): Promise<MasteryThresholdRecord | null> {
    const { mastery } = await this.latest();

    return mastery.get(tankId) ?? null;
  }

  async latest(source?: ThresholdSource): Promise<ThresholdSet> {
    const loaded = await this.cache.fetch(source ?? CATALOG.key, { context: source });

    return loaded ?? { moe: new Map(), mastery: new Map() };
  }

  async asOf({ date, source }: ThresholdsAsOfInput): Promise<ThresholdSet> {
    const upTo = date ?? new Date('9999-12-31');

    const [moe, mastery] = await Promise.all([
      this.queries.latestThresholds({ db: this.prisma.$kysely, kind: 'moe', upTo, source }),
      this.queries.latestThresholds({ db: this.prisma.$kysely, kind: 'mastery', upTo, source })
    ]);

    return {
      moe: preferredBySource(moe.map(toMoeThresholdRecord)),
      mastery: preferredBySource(mastery.map(toMasteryThresholdRecord).filter(isNonNull))
    };
  }

  async moeHistory({ tankId, from, to, source }: MoeHistoryInput): Promise<MoeThresholdRecord[]> {
    const rows = await this.prisma.tankThreshold.findMany({
      where: {
        kind: 'moe',
        tankId,
        ...(source ? { source } : {}),
        date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }
      },
      orderBy: [{ date: 'asc' }, { source: 'asc' }]
    });

    return rows.map(toMoeThresholdRecord);
  }
}
