import { keys } from 'remeda';

import type { TankSpecGroup, TankSpecMeta } from '../model/tank-specs.types';

export const TANK_SPECS = {
  shellDamage: { group: 'firepower', unit: 'hp', digits: 0 },
  shellPenetration: { group: 'firepower', unit: 'mm', digits: 0 },
  damagePerMinute: { group: 'firepower', unit: 'none', digits: 0 },
  reloadTime: { group: 'firepower', unit: 's', digits: 2, lowerIsBetter: true },
  rateOfFire: { group: 'firepower', unit: 'per_min', digits: 2 },
  aimingTime: { group: 'firepower', unit: 's', digits: 2, lowerIsBetter: true },
  dispersion: { group: 'firepower', unit: 'm', digits: 3, lowerIsBetter: true },
  dispersionMovement: { group: 'firepower', unit: 'none', digits: 3, lowerIsBetter: true },
  depression: { group: 'firepower', unit: 'deg', digits: 1, lowerIsBetter: true },
  maxHealth: { group: 'survivability', unit: 'hp', digits: 0 },
  weight: { group: 'mobility', unit: 't', digits: 1, lowerIsBetter: true },
  enginePower: { group: 'mobility', unit: 'horsepower', digits: 0 },
  powerToWeight: { group: 'mobility', unit: 'hp_t', digits: 1 },
  speedForward: { group: 'mobility', unit: 'kmh', digits: 0 },
  speedBackward: { group: 'mobility', unit: 'kmh', digits: 0 },
  hullTraverse: { group: 'mobility', unit: 'deg_s', digits: 1 },
  turretTraverse: { group: 'mobility', unit: 'deg_s', digits: 1 },
  viewRange: { group: 'scouting', unit: 'm', digits: 0 },
  radioRange: { group: 'scouting', unit: 'm', digits: 0 }
} as const satisfies Record<string, TankSpecMeta>;

export const TANK_SPEC_KEYS = keys(TANK_SPECS);

export const TANK_SPEC_GROUPS = ['firepower', 'survivability', 'mobility', 'scouting'] as const satisfies readonly TankSpecGroup[];

export const TANK_SPEC_RANK = {
  epsilon: 1e-9
} as const;

export const TANK_SPEC_FORMAT = {
  missing: '—',
  fallbackDigits: 2
} as const;
