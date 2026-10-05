import type { BuildOptions, ProvisionKind } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import { BUILD_SLOTS } from '../config/provisions.constants';
import { isCrewSkill, isFieldModification } from '../lib/game-data-guards/game-data-guards';
import { fieldModificationSteps } from '../lib/progression/progression';
import { toModuleOption } from '../mappers/module-option.mappers';
import { toProvisionOption } from '../mappers/provision-option.mappers';
import { BuildDataService } from './build-data.service';

@Injectable()
export class BuildOptionsReaderService {
  constructor(private readonly data: BuildDataService) {}

  async options(tankId: number): Promise<BuildOptions> {
    const vehicle = await this.data.vehicle(tankId);

    const [provisions, skills, progression] = await Promise.all([
      this.data.provisions(tankId),
      this.data.crewSkills(),
      this.data.progression(vehicle.postProgressionTree)
    ]);

    const options = provisions.map((row) => ({ row, option: toProvisionOption(row) }));
    const ofKind = (kind: ProvisionKind) => options.filter(({ option }) => option.kind === kind).map(({ option }) => option);
    const modificationRows = options.filter(({ option }) => option.kind === 'fieldModification');
    const optionByTag = new Map(modificationRows.map(({ option }) => [option.tag, option]));
    const roles = new Set(vehicle.crew.flatMap((member) => [member.role, ...member.extraRoles]));

    return {
      tankId,
      modules: {
        chassis: vehicle.chassis.map(toModuleOption),
        turrets: vehicle.turrets.map((turret) => ({ ...toModuleOption(turret), guns: turret.guns.map(toModuleOption) })),
        engines: vehicle.engines.map(toModuleOption),
        radios: vehicle.radios.map(toModuleOption)
      },
      crew: vehicle.crew.map((member) => ({ role: member.role, extraRoles: member.extraRoles })),
      optionalDevices: ofKind('optionalDevice'),
      consumables: ofKind('consumable'),
      directives: ofKind('directive'),
      fieldModifications: fieldModificationSteps({
        tree: progression.tree,
        pairs: progression.pairs,
        modifications: modificationRows.flatMap(({ row }) => (isFieldModification(row.data) ? [row.data] : [])),
        tier: vehicle.tier,
        optionOf: (name) => optionByTag.get(name)
      }),
      crewSkills: skills.flatMap((row) => {
        const definition = isCrewSkill(row.data) ? row.data : null;

        if (!row.isCommon && !row.roles.some((role) => roles.has(role))) {
          return [];
        }

        return [
          {
            skill: row.skill,
            name: row.name,
            nameEn: row.nameEn,
            roles: row.roles,
            isCommon: row.isCommon,
            image: row.image,
            params: (definition?.params ?? []).map((param) => ({ name: param.name, perLevel: param.perLevel, situational: param.situational }))
          }
        ];
      }),
      slots: {
        optionalDevices: BUILD_SLOTS.optionalDevices,
        consumables: BUILD_SLOTS.consumables,
        directives: BUILD_SLOTS.directives
      }
    };
  }
}
