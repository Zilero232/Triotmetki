import { Inject, Injectable } from '@nestjs/common';
import { subDays, subMinutes } from 'date-fns';
import { Redis } from 'ioredis';

import type { PulseView } from '../pulse.types';
import type { PulseQueries } from '../queries/pulse.types';

import { parseJsonText } from '../../../common/lib';
import { PrismaService, REDIS } from '../../../core';
import { PULSE } from '../config/pulse.constants';
import { PULSE_QUERY_TOKENS } from '../config/queries.constants';
import { pulseSchema } from '../dto/pulse.schemas';
import { activityGrid, bestHours, decodeSample } from '../lib/pulse-grid/pulse-grid';

@Injectable()
export class PulseReaderService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(PULSE_QUERY_TOKENS.pulse) private readonly queries: PulseQueries
  ) {}

  async view(now: Date): Promise<PulseView> {
    const cached = await this.redis.get(PULSE.cacheKey);
    const parsed = cached ? pulseSchema.safeParse(parseJsonText(cached)) : null;

    if (parsed?.success) {
      return parsed.data;
    }

    const view = await this.compute(now);

    await this.redis.set(PULSE.cacheKey, JSON.stringify(view), 'EX', PULSE.cacheSeconds);

    return view;
  }

  private async compute(now: Date): Promise<PulseView> {
    const since = subDays(now, PULSE.heatmapDays);
    const activeSince = subMinutes(now, PULSE.activeWindowMinutes);
    const [rows, activePlayers, trackedPlayers, members] = await Promise.all([
      this.queries.activityByHour({ db: this.prisma.$kysely, since, now }),
      this.prisma.player.count({ where: { lastBattleAt: { gte: activeSince, lte: now } } }),
      this.prisma.player.count({ where: { lastBattleAt: { gte: since } } }),
      this.redis.zrangebyscore(PULSE.samplesKey, subDays(now, PULSE.seriesDays).getTime(), now.getTime())
    ]);

    const heatmap = activityGrid(rows);

    return {
      timezone: PULSE.timezone,
      since: since.toISOString(),
      activePlayers,
      trackedPlayers,
      heatmap,
      bestHours: bestHours({ grid: heatmap, count: PULSE.bestHours }),
      series: members.flatMap((member) => {
        const sample = decodeSample(member);

        return sample ? [{ at: sample.at.toISOString(), players: sample.players }] : [];
      }),
      computedAt: now.toISOString()
    };
  }
}
