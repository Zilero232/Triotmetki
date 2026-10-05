import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import type { AccountBatchPayload, EnrolPayload } from '../../contracts';
import type { PollResult } from '../tracking.types';

import { PrismaService } from '../../../../core';
import { JOB, QUEUE } from '../../contracts';
import { PollSyncService } from './poll-sync.service';

@Injectable()
export class EnrolService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: PollSyncService,
    @InjectQueue(QUEUE.clans) private readonly clansQueue: Queue
  ) {}

  async enrol({ accountId }: EnrolPayload): Promise<PollResult> {
    const result = await this.pipeline.run({ accountIds: [accountId], lane: 'priority', tier: 'active', promote: true });

    if (result.blocked.length > 0 || result.missing.length > 0) {
      return result;
    }

    await this.prisma.player.updateMany({ where: { accountId: BigInt(accountId) }, data: { lastViewedAt: new Date() } });

    await this.clansQueue.add(JOB.clans.history, { accountIds: [accountId] } satisfies AccountBatchPayload, {
      deduplication: { id: `clan-history:${accountId}` }
    });

    return result;
  }
}
