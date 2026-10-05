import type { CrewSkill as CrewSkillData, Equipment, FieldModification, InstalledDevice } from '@otmetki/gamedata';

import { isNonNullish, unique } from 'remeda';

import type {
  AssembledLoadout,
  AssembleLoadoutInput,
  FitsTankInput,
  PickCrewSkillsInput,
  PickFieldModificationsInput,
  PickOptionalDevicesInput,
  PickProvisionsInput,
  ProvisionContext
} from './assemble-loadout.types';

import { LOADOUT_DEFAULTS } from '../../config/provisions.constants';
import { isCrewSkill, isEquipment, isFieldModification, isOptionalDevice } from '../game-data-guards/game-data-guards';

const fitsTank = ({ row, tankId }: FitsTankInput) => row.tankIds.includes(tankId);

const pickProvisions = <T>({ context, ids, type, guard }: PickProvisionsInput<T>): T[] =>
  ids.filter(isNonNullish).flatMap((id) => {
    const row = context.byId.get(id);

    if (!row || row.type !== type || !fitsTank({ row, tankId: context.tankId }) || !guard(row.data)) {
      context.ignored.push(`${type}:${id}`);

      return [];
    }

    return [row.data];
  });

const pickOptionalDevices = ({ context, request }: PickOptionalDevicesInput): InstalledDevice[] =>
  request.loadout.equipment.flatMap((id, slot) => {
    const [device] = pickProvisions({ context, ids: id === null ? [] : [id], type: 'optionalDevice', guard: isOptionalDevice });

    return device ? [{ device, specialized: request.specialized[slot] ?? false }] : [];
  });

const pickFieldModifications = ({ context, provisions, names }: PickFieldModificationsInput): FieldModification[] => {
  const byTag = new Map(
    provisions
      .filter((row) => row.type === 'fieldModification' && fitsTank({ row, tankId: context.tankId }))
      .map((row) => [row.tag ?? row.name, row.data])
  );

  return names.flatMap((name) => {
    const data = byTag.get(name);

    if (!isFieldModification(data)) {
      context.ignored.push(`fieldModification:${name}`);

      return [];
    }

    return [data];
  });
};

const pickCrewSkills = ({ context, definitions, crewSkills }: PickCrewSkillsInput): { skill: CrewSkillData }[] =>
  unique(Object.values(crewSkills).flat()).flatMap((name) => {
    const skill = definitions.get(name);

    if (!skill) {
      context.ignored.push(`crewSkill:${name}`);

      return [];
    }

    return [{ skill }];
  });

export const assembleLoadout = ({ tankId, vehicle, request, provisions, skills }: AssembleLoadoutInput): AssembledLoadout => {
  const { loadout } = request;
  const context: ProvisionContext = { tankId, byId: new Map(provisions.map((row) => [row.provisionId, row])), ignored: [] };
  const definitions = new Map(skills.flatMap((row) => (isCrewSkill(row.data) ? [[row.skill, row.data] as const] : [])));

  const optionalDevices = pickOptionalDevices({ context, request });
  const consumables: Equipment[] = pickProvisions({ context, ids: loadout.consumables, type: 'equipment', guard: isEquipment });
  const directives: Equipment[] = pickProvisions({ context, ids: loadout.directives, type: 'directive', guard: isEquipment });
  const fieldModifications = pickFieldModifications({ context, provisions, names: loadout.fieldModifications });
  const crewSkills = pickCrewSkills({ context, definitions, crewSkills: loadout.crewSkills });

  const preset = (loadout.profileId ?? LOADOUT_DEFAULTS.preset) === 'stock' ? 'stock' : 'top';

  return {
    profileId: request.modules ? 'custom' : preset,
    ignored: context.ignored,
    input: {
      vehicle,
      modules: request.modules ?? preset,
      optionalDevices,
      consumables,
      directives,
      fieldModifications,
      crew: { level: request.crewLevel, skills: crewSkills, catalog: [...definitions.values()] },
      state: request.state
    }
  };
};
