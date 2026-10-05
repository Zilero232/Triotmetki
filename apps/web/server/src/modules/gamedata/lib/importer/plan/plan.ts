import type { FinalStats } from '@otmetki/gamedata';

import { calculateLoadout } from '@otmetki/gamedata';

import type {
  CreateImportPlanInput,
  CrewRoleRow,
  CrewSkillRow,
  EntryRow,
  ImportedVehicleSummary,
  ImportPlan,
  ProfileRow,
  TryLoadoutInput
} from '../importer.types';

import { errorMessage } from '../../../../../common/lib';
import { ENTRY_KIND, PROFILE } from '../importer.constants';
import { profileStats, summarizeVehicle } from '../summary/summary';
import { arenaLocalizationKeys, buildArenaRows } from './arena-rows/arena-rows';
import { buildModuleRows } from './module-rows/module-rows';
import { buildProvisionRows, provisionLocalizationKeys } from './provision-rows/provision-rows';
import { buildVehicleRows } from './vehicle-rows/vehicle-rows';

const tryLoadout = ({ vehicle, preset, warnings }: TryLoadoutInput): FinalStats | undefined => {
  try {
    return calculateLoadout({ vehicle, modules: preset });
  } catch (error) {
    warnings.push(`Loadout ${preset} failed for ${vehicle.tag}: ${errorMessage(error)}`);

    return undefined;
  }
};

export const importLocalizationKeys = (data: CreateImportPlanInput['data']): (string | undefined)[] => [
  ...data.vehicles.flatMap((vehicle) => [vehicle.nameKey, vehicle.shortNameKey, vehicle.descriptionKey]),
  ...provisionLocalizationKeys(data),
  ...arenaLocalizationKeys(data)
];

export const createImportPlan = ({ data, messages }: CreateImportPlanInput): ImportPlan => {
  const warnings = [...data.warnings];
  const version = data.version ?? data.revision.sha;
  const profiles: ProfileRow[] = [];
  const summaries = new Map<number, ImportedVehicleSummary>();

  for (const vehicle of data.vehicles) {
    const stock = tryLoadout({ vehicle, preset: 'stock', warnings });
    const top = tryLoadout({ vehicle, preset: 'top', warnings });

    for (const [profileId, stats] of [
      [PROFILE.stock, stock],
      [PROFILE.top, top]
    ] as const) {
      if (stats) {
        profiles.push({
          tankId: vehicle.tankId,
          profileId,
          isDefault: profileId === PROFILE.stock,
          moduleIds: stats.moduleIds,
          data: profileStats(stats)
        });
      }
    }

    summaries.set(vehicle.tankId, summarizeVehicle({ vehicle, stock, top }));
  }

  const crewRoles: CrewRoleRow[] = data.crew.roles.map((role) => ({ role: role.role, name: role.displayName, skills: role.skills }));

  const crewSkills: CrewSkillRow[] = data.crew.skills.map((skill) => ({
    skill: skill.name,
    name: skill.name,
    type: skill.typeName,
    roles: skill.roles,
    isCommon: skill.isCommon,
    data: { ...skill }
  }));

  const entries: EntryRow[] = [
    { kind: ENTRY_KIND.meta, key: 'revision', data: { ...data.revision, version, warnings: warnings.length } },
    ...data.vehicles.map((vehicle) => ({ kind: ENTRY_KIND.vehicle, key: vehicle.tag, data: vehicle })),
    ...data.shells.map((shell) => ({ kind: ENTRY_KIND.shell, key: `${shell.nation}:${shell.name}`, data: shell })),
    ...data.optionalDevices.map((device) => ({ kind: ENTRY_KIND.optionalDevice, key: device.name, data: device })),
    ...data.equipment.map((item) => ({ kind: ENTRY_KIND.equipment, key: item.name, data: item })),
    ...data.crew.skills.map((skill) => ({ kind: ENTRY_KIND.crewSkill, key: skill.name, data: skill })),
    ...data.crew.roles.map((role) => ({ kind: ENTRY_KIND.crewRole, key: role.role, data: role })),
    ...data.postProgression.trees.map((tree) => ({ kind: ENTRY_KIND.progressionTree, key: tree.name, data: tree })),
    ...data.postProgression.modifications.map((item) => ({ kind: ENTRY_KIND.fieldModification, key: item.name, data: item })),
    ...data.postProgression.pairs.map((item) => ({ kind: ENTRY_KIND.modificationPair, key: item.name, data: item })),
    ...data.arenas.map((arena) => ({ kind: ENTRY_KIND.arena, key: arena.arenaId, data: arena }))
  ];

  return {
    version,
    title: `${data.revision.sourceId} ${version}`,
    revision: data.revision,
    vehicles: buildVehicleRows({ vehicles: data.vehicles, messages }),
    profiles,
    modules: buildModuleRows(data.vehicles),
    provisions: buildProvisionRows({ data, messages }),
    crewRoles,
    crewSkills,
    arenas: buildArenaRows({ data, messages }),
    entries,
    summaries,
    warnings
  };
};
