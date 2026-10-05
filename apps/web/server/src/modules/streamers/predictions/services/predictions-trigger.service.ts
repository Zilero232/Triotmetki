import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { differenceInSeconds } from 'date-fns';

import type { BattleEventsSink, BattleStartedEvent } from '../../../mod';
import type { PredictionJob } from '../lib/prediction/prediction.types';

import { errorMessage } from '../../../../common/lib';
import { PrismaService } from '../../../../core';
import { STREAMERS_QUEUE } from '../../config/queue.constants';
import { PREDICTIONS } from '../config/predictions.constants';

@Injectable()
export class PredictionsTriggerService implements BattleEventsSink {
  private readonly logger = new Logger(PredictionsTriggerService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(STREAMERS_QUEUE.name) private readonly queue: Queue
  ) {}

  async started({ accountId, tankId, occurredAt }: BattleStartedEvent): Promise<void> {
    if (tankId === null || differenceInSeconds(new Date(), occurredAt) > PREDICTIONS.startFreshSeconds) {
      return;
    }

    try {
      const watched = await this.prisma.streamerIntegration.count({
        where: {
          provider: 'twitch',
          config: { path: ['predictions'], equals: true },
          OR: [{ user: { streamerProfile: { accountId } } }, { user: { lestaAccounts: { some: { accountId, isPrimary: true } } } }]
        }
      });

      if (watched === 0) {
        return;
      }

      const job: PredictionJob = { accountId: String(accountId), tankId, occurredAt: occurredAt.toISOString() };

      await this.queue.add(STREAMERS_QUEUE.jobs.predictionOpen, job, { removeOnComplete: true, removeOnFail: PREDICTIONS.failedJobsKept });
    } catch (error) {
      this.logger.warn(`prediction trigger for ${accountId} failed: ${errorMessage(error)}`);
    }
  }
}
