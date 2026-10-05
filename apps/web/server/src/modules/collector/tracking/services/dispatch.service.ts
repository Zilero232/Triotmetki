import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { addMinutes, subHours } from 'date-fns';
import { chunk } from 'remeda';

import type { AccountBatchPayload } from '../../contracts';
import type { PlayerQueries } from '../queries/players.types';
import type { EnqueueBatchesInput, SweepTier } from '../tracking.types';

import { PrismaService } from '../../../../core';
import { chunkIds } from '../../../../lib/lesta';
import { JOB, QUEUE } from '../../contracts';
import { TRACKING, TRACKING_TOKENS } from '../config/tracking.constants';

@Injectable()
export class DispatchService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE.poll) private readonly pollQueue: Queue,
    @InjectQueue(QUEUE.sweep) private readonly sweepQueue: Queue,
    @Inject(TRACKING_TOKENS.playerQueries) private readonly queries: PlayerQueries
  ) {}

  async dispatchActive(): Promise<number> {
    const now = new Date();

    const claimed = await this.queries.claimDueActivePlayers({
      db: this.prisma.$kysely,
      now,
      nextPollAt: addMinutes(now, TRACKING.intervals.activeMinutes),
      limit: TRACKING.dispatch.maxActivePerTick
    });

    if (claimed.length === 0) {
      return 0;
    }

    await this.enqueue({ queue: this.pollQueue, name: JOB.poll.batch, accountIds: claimed });

    return claimed.length;
  }

  async dispatchSweep(tier: SweepTier): Promise<number> {
    const backlog = await this.sweepQueue.getJobCounts(...TRACKING.dispatch.sweepBacklogStates);

    if (Object.values(backlog).some((count) => count > 0)) {
      return 0;
    }

    const polledBefore = subHours(new Date(), TRACKING.dispatch.sweepMinAgeHours);
    let cursor = 0n;
    let total = 0;
    let pageSize = 0;

    do {
      const page = await this.prisma.player.findMany({
        where: {
          trackingTier: tier,
          accountId: { gt: cursor },
          OR: [{ lastPolledAt: null }, { lastPolledAt: { lt: polledBefore } }]
        },
        orderBy: { accountId: 'asc' },
        select: { accountId: true },
        take: TRACKING.dispatch.sweepPageSize
      });

      pageSize = page.length;
      cursor = page.at(-1)?.accountId ?? cursor;
      total += pageSize;

      await this.enqueue({
        queue: this.sweepQueue,
        name: JOB.sweep.batch,
        accountIds: page.map((player) => Number(player.accountId)),
        priority: tier === 'dormant' ? TRACKING.dispatch.dormantPriority : undefined
      });
    } while (pageSize === TRACKING.dispatch.sweepPageSize);

    return total;
  }

  async enqueueSweep(accountIds: readonly number[]) {
    await this.enqueue({ queue: this.sweepQueue, name: JOB.sweep.batch, accountIds });
  }

  private async enqueue({ queue, name, accountIds, priority }: EnqueueBatchesInput) {
    const jobs = chunkIds({ ids: accountIds }).map((part) => ({
      name,
      data: { accountIds: part } satisfies AccountBatchPayload,
      opts: { priority }
    }));

    for (const part of chunk(jobs, TRACKING.dispatch.addBulkChunk)) {
      await queue.addBulk(part);
    }
  }
}
