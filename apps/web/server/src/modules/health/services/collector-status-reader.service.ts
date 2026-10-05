import type { CollectorHealth } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

import { isoDay } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { COLLECTOR_STATE_KEY } from '../../collector';
import { jobSuccessSchema } from '../../collector/metrics';
import { HEALTH } from '../config/health.constants';
import { queuesSnapshotSchema } from '../dto/health.schemas';
import { collectorJobs, toQueueBacklog } from '../lib/collector-status/collector-status';

@Injectable()
export class CollectorStatusReaderService {
  private readonly cache = new LRUCache<string, CollectorHealth>({
    max: 1,
    ttl: HEALTH.collectorCacheMs,
    fetchMethod: () => this.load().catch(() => this.unknown())
  });

  constructor(private readonly prisma: PrismaService) {}

  async status(): Promise<CollectorHealth> {
    return (await this.cache.fetch(HEALTH.collectorCacheKey)) ?? this.unknown();
  }

  private unknown(): CollectorHealth {
    return { jobs: collectorJobs({ successes: {}, xvmVersion: null, gameFiles: null }), queues: [], queuesCollectedAt: null, lastModBattleAt: null };
  }

  private async load(): Promise<CollectorHealth> {
    const [successes, queues, expected, gameVersion, battle] = await Promise.all([
      this.state(COLLECTOR_STATE_KEY.jobSuccess).then((value) => jobSuccessSchema.safeParse(value)),
      this.state(COLLECTOR_STATE_KEY.queues).then((value) => queuesSnapshotSchema.safeParse(value)),
      this.prisma.wn8ExpectedValue.findFirst({ orderBy: { date: 'desc' }, select: { date: true } }),
      this.prisma.gameVersion.findFirst({
        where: { commitSha: { not: null }, dataEntries: { some: {} } },
        orderBy: { detectedAt: 'desc' },
        select: { id: true, version: true }
      }),
      this.prisma.battle.findFirst({ orderBy: { receivedAt: 'desc' }, select: { receivedAt: true } })
    ]);

    const imported = gameVersion
      ? await this.prisma.gameDataEntry.findFirst({
          where: { gameVersionId: gameVersion.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        })
      : null;

    return {
      jobs: collectorJobs({
        successes: successes.success ? successes.data : {},
        xvmVersion: expected ? isoDay(expected.date) : null,
        gameFiles: gameVersion ? { version: gameVersion.version, importedAt: imported?.createdAt.toISOString() ?? null } : null
      }),
      queues: queues.success ? toQueueBacklog(queues.data.queues) : [],
      queuesCollectedAt: queues.success ? queues.data.collectedAt : null,
      lastModBattleAt: battle?.receivedAt.toISOString() ?? null
    };
  }

  private async state(key: string): Promise<unknown> {
    const row = await this.prisma.collectorState.findUnique({ where: { key }, select: { value: true } });

    return row?.value;
  }
}
