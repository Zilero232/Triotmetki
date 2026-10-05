import type { PopularBuilds, ProvisionOption } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { loadoutSchema } from '@otmetki/schemas';
import { subDays } from 'date-fns';
import { isNonNullish, sumBy, unique } from 'remeda';

import type { BattleSamplesInput, PopularBuildsInput } from '../builds.types';
import type { LoadoutSample, RankedLoadout } from '../lib/popular-builds/popular-builds.types';

import { Prisma } from '../../../../generated';
import { PrismaService } from '../../../core';
import { bonusTypesOf } from '../../collector';
import { readStoredLoadout } from '../../mod';
import { POPULAR_SOURCE } from '../config/popular.constants';
import { hasItems, rankLoadouts } from '../lib/popular-builds/popular-builds';
import { toProvisionOption } from '../mappers/provision-option.mappers';
import { BuildDataReaderService } from './build-data-reader.service';

@Injectable()
export class PopularBuildsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly data: BuildDataReaderService
  ) {}

  async popular({ tankId, query }: PopularBuildsInput): Promise<PopularBuilds> {
    const fromBattles = (await this.battleSamples({ tankId, mode: query.mode })).filter(hasItems);
    const samples = fromBattles.length > 0 ? fromBattles : (await this.buildSamples(tankId)).filter(hasItems);
    const source = fromBattles.length > 0 ? 'battles' : samples.length > 0 ? 'builds' : 'none';
    const ranked = rankLoadouts({ samples, limit: query.limit });
    const options = await this.options(ranked);

    const resolve = (ids: readonly number[]): ProvisionOption[] => ids.flatMap((id) => options.get(id) ?? []);

    return {
      tankId,
      source,
      sampleSize: sumBy(samples, (sample) => sample.weight),
      builds: ranked.map((build) => ({
        optionalDevices: resolve(build.optionalDevices),
        consumables: resolve(build.consumables),
        directives: resolve(build.directives),
        battles: build.battles,
        share: build.share,
        winRate: build.winRate,
        avgDamage: build.avgDamage
      }))
    };
  }

  private async battleSamples({ tankId, mode }: BattleSamplesInput): Promise<LoadoutSample[]> {
    const rows = await this.prisma.battle.findMany({
      where: {
        tankId,
        startedAt: { gte: subDays(new Date(), POPULAR_SOURCE.windowDays) },
        loadout: { not: Prisma.DbNull },
        ...(mode ? { battleType: { in: bonusTypesOf(mode) } } : {})
      },
      select: { loadout: true, result: true, damageDealt: true },
      orderBy: { startedAt: 'desc' },
      take: POPULAR_SOURCE.maxBattles
    });

    return rows.flatMap((row) => {
      const loadout = readStoredLoadout(row.loadout);

      return loadout
        ? [
            {
              optionalDevices: loadout.optionalDevices.filter(isNonNullish),
              consumables: loadout.consumables.filter(isNonNullish),
              directives: loadout.directives.filter(isNonNullish),
              weight: 1,
              won: row.result === 'draw' ? null : row.result === 'win',
              damage: row.damageDealt
            }
          ]
        : [];
    });
  }

  private async buildSamples(tankId: number): Promise<LoadoutSample[]> {
    const rows = await this.prisma.build.findMany({
      where: { tankId, status: 'published', visibility: 'public' },
      select: { loadout: true, likesCount: true },
      orderBy: { likesCount: 'desc' },
      take: POPULAR_SOURCE.maxBuilds
    });

    return rows.flatMap((row) => {
      const parsed = loadoutSchema.safeParse(row.loadout);

      return parsed.success
        ? [
            {
              optionalDevices: parsed.data.equipment.flatMap((id) => (id === null ? [] : [id])),
              consumables: parsed.data.consumables.flatMap((id) => (id === null ? [] : [id])),
              directives: parsed.data.directives.flatMap((id) => (id === null ? [] : [id])),
              weight: 1 + Math.max(0, row.likesCount),
              won: null,
              damage: null
            }
          ]
        : [];
    });
  }

  private async options(ranked: readonly RankedLoadout[]): Promise<Map<number, ProvisionOption>> {
    const ids = unique(ranked.flatMap((build) => [...build.optionalDevices, ...build.consumables, ...build.directives]));
    const rows = await this.data.provisionsByIds(ids);

    return new Map(rows.map((row) => [row.provisionId, toProvisionOption(row)]));
  }
}
