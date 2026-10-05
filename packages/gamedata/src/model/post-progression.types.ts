import type { Modifier } from '../modifiers';
import type { Price } from './common.types';

export type ProgressionStep = {
  id: number;
  level: number;
  priceKey?: string;
  action: { type: string; value: string };
  unlocks: number[];
  minVehicleLevel?: number;
  maxVehicleLevel?: number;
};

export type ProgressionTree = {
  name: string;
  id: number;
  rootStep: number;
  steps: ProgressionStep[];
};

export type FieldModification = {
  name: string;
  id: number;
  provisionId: number;
  nameKey?: string;
  locName?: string;
  imgName?: string;
  modifiers: Modifier[];
};

export type ModificationPair = {
  name: string;
  id: number;
  first: string;
  second: string;
  priceKey?: string;
};

export type ProgressionFeature = {
  name: string;
  id: number;
  imgName?: string;
  locName?: string;
};

export type PostProgression = {
  trees: ProgressionTree[];
  modifications: FieldModification[];
  pairs: ModificationPair[];
  features: ProgressionFeature[];
  prices: Record<string, Record<number, Price>>;
};

export type VehicleProgressionStep = ProgressionStep & {
  modification?: FieldModification;
  pair?: [FieldModification, FieldModification];
};
