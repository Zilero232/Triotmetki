import { Inject, Injectable, Optional } from '@nestjs/common';
import { subDays, subHours } from 'date-fns';
import { groupBy } from 'remeda';

import type { DayTally, StoreDailyInput, TallyChunkInput } from '../honest-rng.types';
import type { RngWatermark } from '../lib/rng-daily/rng-daily.types';
import type { RngBattlesQueries } from '../queries/rng-battles.types';

import { moscowCalendarDate, toJsonValue } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { readStoredShots } from '../../analytics';
import { HONEST_RNG_AGGREGATE, RNG_BATTLES_QUERIES, RNG_PERIODS } from '../config/aggregate.constants';
import { battleScopes, dailyFromTally, tallyFromDaily } from '../lib/rng-daily/rng-daily';
import { rngWatermarkSchema } from '../lib/rng-daily/rng-daily.schemas';
import { emptyTally, foldBattle, mergeTally, tallySummary } from '../lib/roll-tally/roll-tally';
import { rngBattlesQueries } from '../queries/rng-battles.queries';

@Injectable()
export class RngAggregateService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(RNG_BATTLES_QUERIES) private readonly queries: RngBattlesQueries = rngBattlesQueries
  ) {}

  async compute(now = new Date()) {
    const battles = await this.foldNewBattles(now);
    const rows = await this.rebuild(now);

    return { battles, rows };
  }

  private async foldNewBattles(now: Date): Promise<number> {
    const until = subHours(now, HONEST_RNG_AGGREGATE.settleHours);
    const vehicles = await this.prisma.vehicle.findMany({ select: { tankId: true, tier: true } });
    const tiers = new Map(vehicles.map((vehicle) => [vehicle.tankId, vehicle.tier]));
    let watermark = await this.watermark();
    let folded = 0;

    for (;;) {
      const chunk = await this.queries.rngBattles({ db: this.prisma.$kysely, watermark, until, limit: HONEST_RNG_AGGREGATE.chunk });
      const last = chunk.at(-1);

      if (!last) {
        return folded;
      }

      watermark = { receivedAt: last.receivedAt, id: last.id };
      await this.store({ tallies: this.tallyChunk({ chunk, tiers }), watermark });
      folded += chunk.length;

      if (chunk.length < HONEST_RNG_AGGREGATE.chunk) {
        return folded;
      }
    }
  }

  private tallyChunk({ chunk, tiers }: TallyChunkInput): DayTally[] {
    const tallies = new Map<string, DayTally>();

    for (const battle of chunk) {
      const day = moscowCalendarDate(battle.startedAt);
      const accuracy = { fired: battle.shotsFired ?? 0, hit: battle.shotsHit ?? 0, pierced: battle.shotsPierced ?? 0 };

      for (const scope of battleScopes({ tier: tiers.get(battle.tankId), shots: readStoredShots(battle.shots), accuracy })) {
        const key = `${day.getTime()}|${scope.scope}`;
        const entry = tallies.get(key) ?? { day, scope: scope.scope, tally: emptyTally() };

        foldBattle({ tally: entry.tally, accountId: String(battle.accountId), shots: scope.shots, accuracy: scope.accuracy });
        tallies.set(key, entry);
      }
    }

    return [...tallies.values()];
  }

  private async watermark(): Promise<RngWatermark | null> {
    const state = await this.prisma.collectorState.findUnique({ where: { key: HONEST_RNG_AGGREGATE.watermarkKey } });
    const parsed = rngWatermarkSchema.safeParse(state?.value);

    return parsed.success ? parsed.data : null;
  }

  private async store({ tallies, watermark }: StoreDailyInput): Promise<void> {
    const value = { receivedAt: watermark.receivedAt.toISOString(), id: watermark.id };

    await this.prisma.$transaction(async (tx) => {
      const stored = await tx.rngDaily.findMany({ where: { OR: tallies.map(({ day, scope }) => ({ day, scope })) } });
      const existing = new Map(stored.map((row) => [`${row.day.getTime()}|${row.scope}`, row]));

      for (const { day, scope, tally } of tallies) {
        const previous = existing.get(`${day.getTime()}|${scope}`);
        const merged = previous ? mergeTally({ into: tallyFromDaily(previous), from: tally }) : tally;
        const row = dailyFromTally({ day, scope, tally: merged });

        await tx.rngDaily.upsert({ where: { day_scope: { day, scope } }, create: row, update: row });
      }

      await tx.collectorState.upsert({
        where: { key: HONEST_RNG_AGGREGATE.watermarkKey },
        create: { key: HONEST_RNG_AGGREGATE.watermarkKey, value },
        update: { value }
      });
    });
  }

  private async rebuild(now: Date): Promise<number> {
    const daily = await this.prisma.rngDaily.findMany();

    const rows = RNG_PERIODS.flatMap((period) => {
      const days = HONEST_RNG_AGGREGATE.periodDays[period];
      const from = days === null ? null : moscowCalendarDate(subDays(now, days));
      const inPeriod = from === null ? daily : daily.filter((row) => row.day >= from);

      return Object.entries(groupBy(inPeriod, (row) => row.scope)).map(([scope, group]) => {
        const tally = group.reduce((total, row) => mergeTally({ into: total, from: tallyFromDaily(row) }), emptyTally());
        const { buckets, ...summary } = tallySummary(tally);

        return { scope, period, ...summary, buckets: toJsonValue(buckets), computedAt: now };
      });
    });

    await this.prisma.$transaction([this.prisma.rngAggregate.deleteMany(), this.prisma.rngAggregate.createMany({ data: rows })]);

    return rows.length;
  }
}
