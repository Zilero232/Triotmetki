import type { BattleAnalysis, MyBattle, MyBattlesPage, TankReference } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';

import type { Battle } from '../../../../generated';
import type { BattleInput, BattlesInput } from '../analytics.types';
import type { AnalyticsQueries } from '../providers/analytics-queries.provider.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { paginate } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { UsageMeterService } from '../../usage';
import { ANALYTICS_QUERIES, BATTLE_REVIEW } from '../config';
import { readStoredShots, reviewBattle, shotRolls } from '../lib';
import { toMyBattle, toTankReference } from '../mappers';
import { OwnAccountReaderService } from './own-account-reader.service';

@Injectable()
export class BattleReviewReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly accounts: OwnAccountReaderService,
    private readonly usage: UsageMeterService,
    @Inject(ANALYTICS_QUERIES) private readonly queries: AnalyticsQueries
  ) {}

  async list({ userId, account, tankId, limit, offset }: BattlesInput): Promise<MyBattlesPage> {
    const accountId = await this.accounts.resolve({ userId, account });
    const where = { accountId, ...(tankId ? { tankId } : {}) };

    return paginate({
      limit,
      offset,
      fetch: async (window) => this.present(await this.prisma.battle.findMany({ where, orderBy: { startedAt: 'desc' }, ...window })),
      count: () => this.prisma.battle.count({ where })
    });
  }

  async detail(input: BattleInput): Promise<MyBattle> {
    const [battle] = await this.present([await this.own(input)]);

    if (!battle) {
      throw new AppNotFoundException('NOT_FOUND', `No battle ${input.id}`);
    }

    return battle;
  }

  async analysis(input: BattleInput): Promise<BattleAnalysis> {
    const row = await this.own(input);
    const [[battle], reference, catalog] = await Promise.all([this.present([row]), this.reference(row), this.catalog.all()]);

    if (!battle) {
      throw new AppNotFoundException('NOT_FOUND', `No battle ${input.id}`);
    }

    const analysis = {
      battle,
      reference,
      rolls: shotRolls(readStoredShots(row.shots)),
      ...reviewBattle({ battle: row, reference, vehicleType: catalog.get(row.tankId)?.summary.type ?? null })
    };

    await this.usage.consume({
      meter: BATTLE_REVIEW.meter,
      actor: { userId: input.userId, deviceId: null, ipHash: null },
      subject: input.id
    });

    return analysis;
  }

  private async own({ userId, id }: BattleInput): Promise<Battle> {
    const accountIds = await this.accounts.accountIds(userId);
    const battle = await this.prisma.battle.findFirst({ where: { id, accountId: { in: accountIds } } });

    if (!battle) {
      throw new AppNotFoundException('NOT_FOUND', `No battle ${id}`);
    }

    return battle;
  }

  private async reference(battle: Battle): Promise<TankReference | null> {
    const row = await this.queries.tankReference({
      db: this.prisma.$kysely,
      accountId: Number(battle.accountId),
      tankId: battle.tankId,
      battleType: battle.battleType,
      excludedBattleId: battle.id
    });

    return row.battles >= BATTLE_REVIEW.minReferenceBattles ? toTankReference(row) : null;
  }

  private async present(rows: Battle[]): Promise<MyBattle[]> {
    const [catalog, arenas] = await Promise.all([
      this.catalog.all(),
      this.prisma.arena.findMany({ where: { arenaId: { in: [...new Set(rows.map((row) => row.arenaId))] } }, select: { arenaId: true, name: true } })
    ]);

    const nameOf = new Map(arenas.map((arena) => [arena.arenaId, arena.name]));

    return rows.map((battle) =>
      toMyBattle({ battle, vehicle: catalog.get(battle.tankId)?.summary ?? null, mapName: nameOf.get(battle.arenaId) ?? null })
    );
  }
}
