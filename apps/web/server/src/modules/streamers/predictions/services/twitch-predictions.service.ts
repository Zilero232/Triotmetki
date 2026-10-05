import type { ApiClient } from '@twurple/api';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { addMinutes } from 'date-fns';
import { Redis } from 'ioredis';
import { meanBy } from 'remeda';

import type { PredictionJob, PredictionState } from '../lib/prediction/prediction.types';
import type { AccountTankInput, SettlePredictionInput } from '../predictions.types';

import { errorMessage } from '../../../../common/lib';
import { PrismaService, REDIS } from '../../../../core';
import { VehicleCatalogService } from '../../../reference';
import { CHAT_COPY, ChatReplyReaderService, TwitchChatService } from '../../chat';
import { TwitchSdkService } from '../../integrations';
import { PREDICTIONS } from '../config/predictions.constants';
import { clipText, predictionThreshold, predictionWinner, readPredictionState } from '../lib/prediction/prediction';

@Injectable()
export class TwitchPredictionsService {
  private readonly logger = new Logger(TwitchPredictionsService.name);
  private client: ApiClient | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chat: TwitchChatService,
    private readonly stats: ChatReplyReaderService,
    private readonly catalog: VehicleCatalogService,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly sdk: TwitchSdkService
  ) {}

  async openFromJob(job: PredictionJob): Promise<number> {
    return (await this.open({ accountId: BigInt(job.accountId), tankId: job.tankId })) ? 1 : 0;
  }

  async settleAll(now = new Date()): Promise<number> {
    const userIds = await this.redis.smembers(PREDICTIONS.openSetKey);
    let settled = 0;

    for (const userId of userIds) {
      settled += (await this.settle({ userId, now })) ? 1 : 0;
    }

    return settled;
  }

  private async open({ accountId, tankId }: AccountTankInput): Promise<boolean> {
    const api = this.api();

    if (!api) {
      return false;
    }

    const integration = await this.prisma.streamerIntegration.findFirst({
      where: {
        provider: 'twitch',
        accessToken: { not: null },
        config: { path: ['predictions'], equals: true },
        OR: [{ user: { streamerProfile: { accountId } } }, { user: { lestaAccounts: { some: { accountId, isPrimary: true } } } }]
      }
    });

    if (!integration || (await this.redis.exists(this.stateKey(integration.userId))) > 0) {
      return false;
    }

    const [threshold, vehicle] = await Promise.all([this.threshold({ accountId, tankId }), this.catalog.summary(tankId)]);
    const streamerUserId = integration.userId;
    const [title, yes, no] = await Promise.all([
      this.stats.text({
        streamerUserId,
        message: CHAT_COPY.messages.predictionTitle,
        values: { tank: vehicle.shortName || vehicle.name, damage: threshold }
      }),
      this.stats.text({ streamerUserId, message: CHAT_COPY.messages.predictionYes, values: {} }),
      this.stats.text({ streamerUserId, message: CHAT_COPY.messages.predictionNo, values: {} })
    ]);

    try {
      const prediction = await api.predictions.createPrediction(integration.externalId, {
        title: clipText({ text: title, max: PREDICTIONS.titleMaxLength }),
        outcomes: [yes, no].map((outcome) => clipText({ text: outcome, max: PREDICTIONS.outcomeMaxLength })),
        autoLockAfter: PREDICTIONS.lockAfterSeconds
      });

      const [yesOutcome, noOutcome] = prediction.outcomes;

      if (!yesOutcome || !noOutcome) {
        return false;
      }

      const state: PredictionState = {
        id: prediction.id,
        broadcasterId: integration.externalId,
        yesId: yesOutcome.id,
        noId: noOutcome.id,
        threshold,
        accountId: String(accountId),
        tankId,
        openedAt: new Date().toISOString()
      };

      await this.redis.set(this.stateKey(integration.userId), JSON.stringify(state), 'EX', PREDICTIONS.stateTtlSeconds);
      await this.redis.sadd(PREDICTIONS.openSetKey, integration.userId);

      return true;
    } catch (error) {
      this.logger.warn(`twitch prediction for ${integration.userId} not opened: ${errorMessage(error)}`);

      return false;
    }
  }

  private async settle({ userId, now }: SettlePredictionInput): Promise<boolean> {
    const api = this.api();
    const state = readPredictionState(await this.redis.get(this.stateKey(userId)));

    if (!api || !state) {
      await this.forget(userId);

      return false;
    }

    const battle = await this.prisma.battle.findFirst({
      where: { accountId: BigInt(state.accountId), tankId: state.tankId, receivedAt: { gt: new Date(state.openedAt) } },
      orderBy: { receivedAt: 'asc' },
      select: { damageDealt: true }
    });

    const isStale = addMinutes(new Date(state.openedAt), PREDICTIONS.maxOpenMinutes) < now;

    if (!battle && !isStale) {
      return false;
    }

    try {
      await (battle
        ? api.predictions.resolvePrediction(state.broadcasterId, state.id, predictionWinner({ state, damage: battle.damageDealt }))
        : api.predictions.cancelPrediction(state.broadcasterId, state.id));
    } catch (error) {
      this.logger.warn(`twitch prediction ${state.id} not settled: ${errorMessage(error)}`);
    }

    await this.forget(userId);

    return true;
  }

  private async threshold({ accountId, tankId }: AccountTankInput): Promise<number> {
    const recent = await this.prisma.battle.findMany({
      where: { accountId, tankId },
      orderBy: { receivedAt: 'desc' },
      take: PREDICTIONS.recentBattles,
      select: { damageDealt: true }
    });

    return predictionThreshold(recent.length === 0 ? null : meanBy(recent, (row) => row.damageDealt));
  }

  private async forget(userId: string): Promise<void> {
    await Promise.all([this.redis.del(this.stateKey(userId)), this.redis.srem(PREDICTIONS.openSetKey, userId)]);
  }

  private stateKey(userId: string): string {
    return `${PREDICTIONS.stateKeyPrefix}${userId}`;
  }

  private api(): ApiClient | null {
    const authProvider = this.chat.authProvider;

    if (!authProvider) {
      return null;
    }

    this.client ??= this.sdk.createApiClient(authProvider);

    return this.client;
  }
}
