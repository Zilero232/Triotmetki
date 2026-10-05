import type { VehicleSpec } from '@otmetki/gamedata';

import { Injectable } from '@nestjs/common';

import type { Provision } from '../../../../generated';
import type { ProgressionData } from '../builds.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { GAME_DATA_KIND } from '../config/provisions.constants';
import { isVehicleSpec } from '../lib/game-data-guards/game-data-guards';

@Injectable()
export class BuildDataReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async vehicle(tankId: number): Promise<VehicleSpec> {
    const row = await this.prisma.vehicle.findUnique({ where: { tankId }, select: { specs: true } });

    if (!row || !isVehicleSpec(row.specs)) {
      throw new AppNotFoundException('TANK_NOT_FOUND', `No game data for tank ${tankId}`);
    }

    return row.specs;
  }

  async provisions(tankId: number): Promise<Provision[]> {
    return this.prisma.provision.findMany({ where: { tankIds: { has: tankId } }, orderBy: { provisionId: 'asc' } });
  }

  async provisionsByIds(ids: readonly number[]): Promise<Provision[]> {
    return ids.length === 0 ? [] : this.prisma.provision.findMany({ where: { provisionId: { in: [...ids] } } });
  }

  async crewSkills() {
    return this.prisma.crewSkill.findMany({ orderBy: { skill: 'asc' } });
  }

  async progression(treeName: string | undefined): Promise<ProgressionData> {
    if (!treeName) {
      return { tree: null, pairs: [] };
    }

    const version = await this.prisma.gameVersion.findFirst({ where: { isCurrent: true, isTest: false }, select: { id: true } });

    if (!version) {
      return { tree: null, pairs: [] };
    }

    const [tree, pairs] = await Promise.all([
      this.prisma.gameDataEntry.findUnique({
        where: { gameVersionId_kind_key: { gameVersionId: version.id, kind: GAME_DATA_KIND.progressionTree, key: treeName } },
        select: { data: true }
      }),
      this.prisma.gameDataEntry.findMany({ where: { gameVersionId: version.id, kind: GAME_DATA_KIND.modificationPair }, select: { data: true } })
    ]);

    return { tree: tree?.data ?? null, pairs: pairs.map((pair) => pair.data) };
  }
}
