import type { TANK_SPECS } from '../config';

export type TankSpecGroup = 'firepower' | 'mobility' | 'scouting' | 'survivability';

type TankSpecUnit = 'deg_s' | 'deg' | 'horsepower' | 'hp_t' | 'hp' | 'kmh' | 'm' | 'mm' | 'none' | 'per_min' | 's' | 't';

export type TankSpecMeta = {
  group: TankSpecGroup;
  unit: TankSpecUnit;
  digits: number;
  lowerIsBetter?: boolean;
};

export type TankSpecKey = keyof typeof TANK_SPECS;
