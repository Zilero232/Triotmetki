import type { AccountEconomy, Paginated, TankEconomy, TankEconomyRow } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { groupBy } from 'remeda';
import { match } from 'ts-pattern';

import type { AccountEconomyLookup, TankEconomyListInput } from '../tanks.types';

import { page, sortRows } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { ACCOUNT_ECONOMY } from '../config/tank-economy.constants';
import { accountEconomy } from '../lib/tank-economy/tank-economy';
import { toTankEconomy } from '../mappers/tank-economy.mappers';
import { TankTraitsReaderService } from './tank-traits-reader.service';

@Injectable()
export class TankEconomyReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly traits: TankTraitsReaderService
  ) {}

  async forTank(tankId: number): Promise<TankEconomy> {
    const rows = await this.prisma.tankEconomyAggregate.findMany({ where: { tankId } });

    return toTankEconomy({ tankId, rows });
  }

  async list(query: TankEconomyListInput): Promise<Paginated<TankEconomyRow>> {
    const [rows, eligible, traits] = await Promise.all([
      this.prisma.tankEconomyAggregate.findMany({ where: { battles: { gte: query.minBattles } } }),
      this.catalog.filter(query).then((entries) => this.traits.filter({ entries, filter: query })),
      this.traits.all()
    ]);

    const byTank = groupBy(rows, (row) => row.tankId);

    const items = eligible.flatMap((entry): TankEconomyRow[] => {
      const { tankId } = entry.summary;
      const economy = toTankEconomy({ tankId, rows: byTank[tankId] ?? [] });

      return economy[query.account]
        ? [{ vehicle: entry.summary, traits: traits.get(tankId)?.traits ?? { status: 'researchable', role: null }, economy }]
        : [];
    });

    const sorted = sortRows({
      rows: items,
      order: query.order,
      value: (row) => {
        const figures = row.economy[query.account];

        return match(query.sort ?? 'credits')
          .with('tier', () => row.vehicle.tier)
          .with('battles', () => figures?.battles ?? null)
          .with('credits', () => figures?.credits ?? null)
          .with('net', () => figures?.net ?? null)
          .with('xp', () => figures?.xp ?? null)
          .with('freeXp', () => figures?.freeXp ?? null)
          .exhaustive();
      }
    });

    return page({ items: sorted, limit: query.limit, offset: query.offset });
  }

  async account({ accountId, days }: AccountEconomyLookup): Promise<AccountEconomy> {
    const [battles, catalog] = await Promise.all([
      this.prisma.battle.findMany({
        where: { accountId, battleType: ACCOUNT_ECONOMY.randomBattleType, startedAt: { gte: subDays(new Date(), days) }, credits: { not: null } },
        select: {
          tankId: true,
          credits: true,
          creditsGross: true,
          repairCost: true,
          ammoCost: true,
          consumablesCost: true,
          xp: true,
          isPremiumAccount: true
        }
      }),
      this.catalog.all()
    ]);

    return accountEconomy({
      accountId: Number(accountId),
      days,
      battles: battles.map((battle) => ({ ...battle, credits: battle.credits ?? 0 })),
      vehicles: new Map([...catalog].map(([tankId, entry]) => [tankId, entry.summary]))
    });
  }
}
