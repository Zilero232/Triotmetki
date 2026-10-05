import type { MoeHistoryQuery, TankRole, vehicleFilterSchema, VehicleSummary } from '@otmetki/schemas';
import type { z } from 'zod';

import type { Prisma, TankThreshold, ThresholdKind, ThresholdSource, VehicleType } from '../../../generated';
import type { THRESHOLD_LEVELS } from './config/thresholds.constants';
import type { SpecTraits } from './lib/vehicle-status/vehicle-status.types';

export type CatalogEntry = {
  summary: VehicleSummary;
  dbType: VehicleType;
  specs: Prisma.JsonValue;
  description: string | null;
  role: TankRole | null;
  spec: SpecTraits;
  hasOffers: boolean;
};

export type VehicleFilter = z.infer<typeof vehicleFilterSchema>;

export type ThresholdLevel = Extract<keyof TankThreshold, `level${number}`>;

export type ThresholdLevels = Pick<TankThreshold, ThresholdLevel>;

type LevelNames<K extends ThresholdKind> = (typeof THRESHOLD_LEVELS)[K];

type NamedLevels<K extends ThresholdKind> = { [N in keyof LevelNames<K>]: TankThreshold[LevelNames<K>[N] & ThresholdLevel] };

type ThresholdBase = Omit<TankThreshold, 'kind' | ThresholdLevel>;

export type MoeLevels = NamedLevels<'moe'>;

export type MasteryLevels = Required<{ [N in keyof NamedLevels<'mastery'>]: NonNullable<NamedLevels<'mastery'>[N]> }>;

export type MoeThresholdRecord = ThresholdBase & MoeLevels;

export type MasteryThresholdRecord = ThresholdBase & MasteryLevels;

export type ThresholdSet = {
  moe: Map<number, MoeThresholdRecord>;
  mastery: Map<number, MasteryThresholdRecord>;
};

export type ThresholdsAsOfInput = {
  date: Date | null;
  source?: ThresholdSource;
};

export type MoeHistoryInput = Omit<MoeHistoryQuery, 'from' | 'source' | 'to'> & {
  from?: Date;
  to?: Date;
  source?: ThresholdSource;
};
