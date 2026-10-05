import type { CrewSkill as CrewSkillData, LoadoutInput, VehicleSpec } from '@otmetki/gamedata';
import type { ParsedLoadoutRequest } from '@otmetki/schemas';

import type { CrewSkill, Provision, ProvisionType } from '../../../../../generated';

export type AssembleLoadoutInput = {
  tankId: number;
  vehicle: VehicleSpec;
  request: ParsedLoadoutRequest;
  provisions: readonly Provision[];
  skills: readonly CrewSkill[];
};

export type AssembledLoadout = {
  input: LoadoutInput;
  profileId: string;
  ignored: string[];
};

export type ProvisionContext = {
  tankId: number;
  byId: ReadonlyMap<number, Provision>;
  ignored: string[];
};

export type FitsTankInput = {
  row: Provision;
  tankId: number;
};

export type PickProvisionsInput<T> = {
  context: ProvisionContext;
  ids: readonly (number | null)[];
  type: ProvisionType;
  guard: (value: unknown) => value is T;
};

export type PickOptionalDevicesInput = Pick<AssembleLoadoutInput, 'request'> & {
  context: ProvisionContext;
};

export type PickFieldModificationsInput = {
  context: ProvisionContext;
  provisions: readonly Provision[];
  names: readonly string[];
};

export type PickCrewSkillsInput = {
  context: ProvisionContext;
  definitions: ReadonlyMap<string, CrewSkillData>;
  crewSkills: ParsedLoadoutRequest['loadout']['crewSkills'];
};
