import type { Usage, UsageAudience, UsageMeterState } from '@otmetki/schemas';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { USAGE_METER_KEYS, USAGE_METERS, usageLimit } from '@otmetki/schemas';
import { millisecondsInSecond } from 'date-fns/constants';
import { Redis } from 'ioredis';

import type { ConsumeUsageInput, ExhaustedInput, IncrementInput, MeterReadInput, RollbackInput, UsageActor } from '../usage.types';

import { AppForbiddenException } from '../../../common/exceptions';
import { errorMessage } from '../../../common/lib';
import { REDIS } from '../../../core';
import { EntitlementsService } from '../../billing';
import { USAGE_METER } from '../config/usage-meter.constants';
import { countKey, meterScopes, meterState, seenKey, unlimitedMeterState } from '../lib/meter-scopes/meter-scopes';
import { usagePeriod } from '../lib/usage-period/usage-period';

@Injectable()
export class UsageMeterService {
  private readonly logger = new Logger(UsageMeterService.name);

  constructor(
    @Inject(REDIS) private readonly redis: Redis,
    private readonly entitlements: EntitlementsService
  ) {}

  async usage(actor: UsageActor): Promise<Usage> {
    const audience = await this.audienceOf(actor);
    const period = usagePeriod(new Date());
    const meters = await Promise.all(USAGE_METER_KEYS.map((meter) => this.read({ meter, audience, actor, period })));

    return { audience, resetsAt: period.resetsAt.toISOString(), meters };
  }

  async consume({ meter, actor, subject }: ConsumeUsageInput): Promise<UsageMeterState> {
    const audience = await this.audienceOf(actor);

    if (usageLimit({ meter, audience }) === null) {
      return unlimitedMeterState(meter);
    }

    const period = usagePeriod(new Date());
    const scopes = meterScopes({ meter, audience, actor });
    const [owner] = scopes;

    if (!owner || scopes.some((scope) => scope.limit === 0)) {
      throw this.exhausted({ meter, limit: owner?.limit ?? 0 });
    }

    const seen = seenKey({ meter, period: period.key, scope: owner.id, subject });

    try {
      const isFirstOpen = (await this.redis.set(seen, '1', 'EX', USAGE_METER.dedupeSeconds, 'NX')) !== null;

      if (!isFirstOpen) {
        return await this.read({ meter, audience, actor, period });
      }

      const counts = await this.increment({ meter, period, scopes });

      if (scopes.some((scope, index) => (counts[index] ?? 0) > scope.limit)) {
        await this.rollback({ meter, period, scopes, seen });

        throw this.exhausted({ meter, limit: owner.limit });
      }

      return meterState({ meter, scopes, counts });
    } catch (error) {
      if (error instanceof AppForbiddenException) {
        throw error;
      }

      this.logger.warn(`usage store unavailable, letting ${meter} through: ${errorMessage(error)}`);

      return meterState({ meter, scopes, counts: [] });
    }
  }

  private async audienceOf(actor: UsageActor): Promise<UsageAudience> {
    if (!actor.userId) {
      return 'anonymous';
    }

    return (await this.entitlements.isPlus(actor.userId)) ? 'plus' : 'free';
  }

  private async read({ meter, audience, actor, period }: MeterReadInput): Promise<UsageMeterState> {
    if (usageLimit({ meter, audience }) === null) {
      return unlimitedMeterState(meter);
    }

    const scopes = meterScopes({ meter, audience, actor });

    if (scopes.length === 0) {
      return meterState({ meter, scopes, counts: [] });
    }

    const values = await this.redis.mget(scopes.map((scope) => countKey({ meter, period: period.key, scope: scope.id }))).catch((error: unknown) => {
      this.logger.warn(`usage store unavailable, reporting ${meter} as unused: ${errorMessage(error)}`);

      return [];
    });

    return meterState({ meter, scopes, counts: scopes.map((_, index) => Number(values[index] ?? 0)) });
  }

  private async increment({ meter, period, scopes }: IncrementInput): Promise<number[]> {
    const expiresAt = Math.ceil(period.resetsAt.getTime() / millisecondsInSecond) + USAGE_METER.expirySlackSeconds;
    const pipeline = this.redis.multi();

    for (const scope of scopes) {
      const key = countKey({ meter, period: period.key, scope: scope.id });

      pipeline.incr(key).expireat(key, expiresAt);
    }

    const results = (await pipeline.exec()) ?? [];

    return scopes.map((_, index) => Number(results[index * 2]?.[1] ?? 0));
  }

  private async rollback({ meter, period, scopes, seen }: RollbackInput): Promise<void> {
    const pipeline = this.redis.multi();

    for (const scope of scopes) {
      pipeline.decr(countKey({ meter, period: period.key, scope: scope.id }));
    }

    await pipeline
      .del(seen)
      .exec()
      .catch((error: unknown) => {
        this.logger.warn(`could not give back a refused ${meter} use: ${errorMessage(error)}`);
      });
  }

  private exhausted({ meter, limit }: ExhaustedInput): AppForbiddenException {
    const { feature } = USAGE_METERS[meter];

    return new AppForbiddenException('SUBSCRIPTION_REQUIRED', `The free ${meter} allowance of ${limit} a month is used up`, { feature, limit });
  }
}
