import type { ModeMeta, ModeSeason, ModesHub, ModeSummary, ModeTank, PlayMode } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { MODE_META, PLAY_MODES } from '@otmetki/schemas';
import { firstBy, sortBy } from 'remeda';

import type { ModeTankAggregate } from '../../../../generated';
import type { ModeMetaInput, ToModeTanksInput } from '../modes.types';

import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { MODE_SEASON_EVENT } from '../config/modes.constants';
import { rankModeTanks } from '../lib/mode-rank/mode-rank';

@Injectable()
export class ModeMetaReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService
  ) {}

  async hub(): Promise<ModesHub> {
    const modes = await Promise.all(PLAY_MODES.map((mode) => this.summary(mode)));

    return { windowDays: MODE_META.windowDays, modes };
  }

  async meta({ mode, query }: ModeMetaInput): Promise<ModeMeta> {
    const [rows, season, eligible] = await Promise.all([
      this.prisma.modeTankAggregate.findMany({ where: { mode } }),
      this.season(mode),
      this.catalog.filter(query)
    ]);

    const allowed = new Set(eligible.map((entry) => entry.summary.tankId));
    const total = rows.find((row) => row.tankId === MODE_META.totalTankId);
    const tankRows = rows.filter((row) => row.tankId !== MODE_META.totalTankId);
    const tanks = await this.toTanks({ rows: tankRows.filter((row) => allowed.has(row.tankId)), minBattles: query.minBattles });

    return {
      mode,
      windowDays: total?.windowDays ?? MODE_META.windowDays,
      minBattles: query.minBattles,
      battles: total?.battles ?? 0,
      players: total?.players ?? 0,
      winRate: total?.winRate ?? null,
      computedAt: this.computedAt(rows),
      season,
      tanks
    };
  }

  private async summary(mode: PlayMode): Promise<ModeSummary> {
    const [rows, season] = await Promise.all([this.prisma.modeTankAggregate.findMany({ where: { mode } }), this.season(mode)]);
    const total = rows.find((row) => row.tankId === MODE_META.totalTankId);
    const tankRows = rows.filter((row) => row.tankId !== MODE_META.totalTankId);
    const tanks = await this.toTanks({ rows: tankRows, minBattles: MODE_META.minBattles });

    return {
      mode,
      battles: total?.battles ?? 0,
      players: total?.players ?? 0,
      tanks: tankRows.length,
      computedAt: this.computedAt(rows),
      season,
      leaders: tanks.filter((tank) => tank.rank !== null).slice(0, MODE_META.hubLeaders)
    };
  }

  private async toTanks({ rows, minBattles }: ToModeTanksInput): Promise<ModeTank[]> {
    const ranked = rankModeTanks({ tanks: rows, minBattles });

    const tanks = await Promise.all(
      rows.map(async (row): Promise<ModeTank> => {
        const place = ranked.get(row.tankId);

        return {
          vehicle: await this.catalog.summary(row.tankId),
          rank: place?.rank ?? null,
          score: place?.score ?? null,
          battles: row.battles,
          players: row.players,
          winRate: row.winRate,
          avgDamage: row.avgDamage,
          avgXp: row.avgXp,
          avgFrags: row.avgFrags,
          survivalRate: row.survivalRate
        };
      })
    );

    return sortBy(tanks, [(tank) => tank.score ?? Number.NEGATIVE_INFINITY, 'desc'], [(tank) => tank.battles, 'desc']);
  }

  private computedAt(rows: readonly ModeTankAggregate[]): string | null {
    return firstBy(rows, [(row) => row.computedAt.getTime(), 'desc'])?.computedAt.toISOString() ?? null;
  }

  private async season(mode: PlayMode): Promise<ModeSeason | null> {
    const kind = MODE_SEASON_EVENT[mode];

    if (!kind) {
      return null;
    }

    const now = new Date();
    const event =
      (await this.prisma.gameEvent.findFirst({
        where: { kind, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        orderBy: { startsAt: 'desc' }
      })) ?? (await this.prisma.gameEvent.findFirst({ where: { kind, startsAt: { gt: now } }, orderBy: { startsAt: 'asc' } }));

    return event ? { title: event.title, url: event.url, startsAt: event.startsAt.toISOString(), endsAt: event.endsAt?.toISOString() ?? null } : null;
  }
}
