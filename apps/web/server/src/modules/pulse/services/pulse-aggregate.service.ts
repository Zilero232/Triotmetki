import { Inject, Injectable } from '@nestjs/common';
import { subDays, subMinutes } from 'date-fns';
import { Redis } from 'ioredis';

import { PrismaService, REDIS } from '../../../core';
import { PULSE } from '../config/pulse.constants';
import { encodeSample } from '../lib/pulse-grid/pulse-grid';

@Injectable()
export class PulseAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}

  async sample(now: Date): Promise<number> {
    const players = await this.prisma.player.count({
      where: { lastBattleAt: { gte: subMinutes(now, PULSE.activeWindowMinutes), lte: now } }
    });

    const results = await this.redis
      .multi()
      .zadd(PULSE.samplesKey, now.getTime(), encodeSample({ at: now, players }))
      .zremrangebyscore(PULSE.samplesKey, 0, subDays(now, PULSE.retentionDays).getTime())
      .exec();

    if (!results) {
      throw new Error('The pulse sample transaction was aborted');
    }

    const failure = results.find(([error]) => error)?.[0];

    if (failure) {
      throw failure;
    }

    return players;
  }
}
