import { Inject, Injectable } from '@nestjs/common';
import { HONEST_RNG } from '@otmetki/schemas';
import { subDays } from 'date-fns';
import { Redis } from 'ioredis';
import { firstBy, sortBy } from 'remeda';

import type { HonestRngMine, HonestRngView, RngMineInput, RngPeriod } from '../honest-rng.types';

import { Prisma } from '../../../../generated';
import { parseJsonText } from '../../../common/lib';
import { PrismaService, REDIS } from '../../../core';
import { OwnAccountReaderService, readStoredShots } from '../../analytics';
import { HONEST_RNG_AGGREGATE } from '../config/aggregate.constants';
import { honestRngSchema } from '../dto/honest-rng.schemas';
import { luckVerdict, theoryBuckets } from '../lib/rng-theory/rng-theory';
import { emptyTally, foldBattle, tallySummary } from '../lib/roll-tally/roll-tally';
import { toRngSummary } from '../mappers/rng-view.mappers';

@Injectable()
export class HonestRngReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: OwnAccountReaderService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}

  async view(period: RngPeriod): Promise<HonestRngView> {
    const cacheKey = `${HONEST_RNG_AGGREGATE.cacheKey}:${period}`;
    const cached = await this.redis.get(cacheKey);
    const parsed = cached ? honestRngSchema.safeParse(parseJsonText(cached)) : null;

    if (parsed?.success) {
      return parsed.data;
    }

    const rows = await this.prisma.rngAggregate.findMany({ where: { period } });
    const scoped = (prefix: string) =>
      rows.filter((row) => row.scope.startsWith(`${prefix}:`)).map((row) => ({ key: row.scope.slice(prefix.length + 1), row }));

    const server = rows.find((row) => row.scope === HONEST_RNG_AGGREGATE.scopes.server);
    const latest = firstBy(rows, [(row) => row.computedAt.getTime(), 'desc']);

    const view: HonestRngView = {
      period,
      spread: HONEST_RNG.spread,
      server: server ? toRngSummary(server) : null,
      theory: theoryBuckets(),
      tiers: sortBy(
        scoped(HONEST_RNG_AGGREGATE.scopes.tier).map(({ key, row }) => ({ ...toRngSummary(row), tier: Number(key) })),
        (row) => row.tier
      ),
      shells: sortBy(
        scoped(HONEST_RNG_AGGREGATE.scopes.shell).map(({ key, row }) => ({ ...toRngSummary(row), shell: key })),
        [(row) => row.shots, 'desc']
      ),
      computedAt: latest ? latest.computedAt.toISOString() : null
    };

    await this.redis.set(cacheKey, JSON.stringify(view), 'EX', HONEST_RNG_AGGREGATE.cacheSeconds);

    return view;
  }

  async mine({ userId, period }: RngMineInput): Promise<HonestRngMine> {
    const accountId = await this.accounts.resolve({ userId });
    const days = HONEST_RNG_AGGREGATE.periodDays[period];

    const [battles, server] = await Promise.all([
      this.prisma.battle.findMany({
        where: { accountId, shots: { not: Prisma.DbNull }, ...(days === null ? {} : { startedAt: { gte: subDays(new Date(), days) } }) },
        select: { shots: true, shotsFired: true, shotsHit: true, shotsPierced: true }
      }),
      this.prisma.rngAggregate.findUnique({
        where: { scope_period: { scope: HONEST_RNG_AGGREGATE.scopes.server, period } },
        select: { meanRoll: true }
      })
    ]);

    const tally = battles.reduce(
      (current, battle) =>
        foldBattle({
          tally: current,
          accountId: String(accountId),
          shots: readStoredShots(battle.shots),
          accuracy: { fired: battle.shotsFired ?? 0, hit: battle.shotsHit ?? 0, pierced: battle.shotsPierced ?? 0 }
        }),
      emptyTally()
    );

    const summary = tallySummary(tally);
    const serverMeanRoll = server?.meanRoll ?? null;

    return {
      period,
      accountId: Number(accountId),
      summary,
      luck: luckVerdict({ meanRoll: summary.meanRoll, shots: summary.shots }),
      serverMeanRoll,
      deltaVsServer: summary.meanRoll !== null && serverMeanRoll !== null ? summary.meanRoll - serverMeanRoll : null
    };
  }
}
