import type { VehicleType } from '../../../../generated';
import type { Vehicle } from '../../../lib/lesta';
import type { MoeEstimate } from './lib/moe-estimate/moe-estimate.types';

export type SectionRunner = () => Promise<number>;

export type VersionCheckResult = {
  version: string;
  changed: boolean;
};

export type WriteVehicleInput = {
  vehicle: Vehicle;
  type: VehicleType;
  slug: string;
  prevTankIds: number[];
};

export type EnglishNamesResult = {
  arenas: number;
  achievements: number;
  crewSkills: number;
};

export type WriteVehiclesInput = {
  vehicles: readonly Vehicle[];
  gameVersionId: number;
};

export type WriteSpecHistoryInput = {
  vehicle: Vehicle;
  gameVersionId: number;
  previousSpecs: unknown;
};

export type ReplaceMoeEstimatesInput = {
  estimates: readonly MoeEstimate[];
  date: Date;
};
