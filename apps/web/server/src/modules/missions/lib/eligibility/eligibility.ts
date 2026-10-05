import type { VehicleType } from '@otmetki/schemas';

import { vehicleTypeSchema } from '@otmetki/schemas';
import { range } from 'remeda';

import type { MissionFilterInput, MissionVehicleFilter } from './eligibility.types';

import { MISSION_TIERS } from '../../config/suitable-tanks.constants';

export const vehicleTypesOf = (values: readonly string[]): VehicleType[] =>
  values.flatMap((value) => {
    const parsed = vehicleTypeSchema.safeParse(value);

    return parsed.success ? [parsed.data] : [];
  });

export const missionFilter = ({ mission, branch }: MissionFilterInput): MissionVehicleFilter => {
  const branchClasses = branch.kind === 'vehicleClass' ? [branch.key] : [];
  const types = vehicleTypesOf(mission.vehicleClasses.length > 0 ? mission.vehicleClasses : branchClasses);
  const tiers = range(Math.max(MISSION_TIERS.min, mission.minTier), Math.min(MISSION_TIERS.max, mission.maxTier) + 1);

  return {
    tiers,
    ...(types.length > 0 ? { types } : {}),
    ...(branch.nations.length > 0 ? { nations: branch.nations } : {})
  };
};
