import type { CareerModeTank, VehicleSummary } from '@otmetki/schemas';

import type { AccountModeStats, TankModeStats } from '../../../../generated';
import type { ModeStatsMode } from '../../collector';

export type CareerTotals = {
  battles: number;
  wins: number;
  damageDealt: number;
  xp: number;
  frags: number;
  survived: number;
  maxDamage: number | null;
  updatedAt: Date | null;
};

export type ToCareerModeLineInput = {
  mode: ModeStatsMode;
  totals: CareerTotals;
  tanks: CareerModeTank[];
};

export type ToCareerModeTankInput = {
  vehicle: VehicleSummary;
  row: Pick<TankModeStats, 'battles' | 'damageDealt' | 'wins'>;
};

export type StoredModeTotals = Pick<AccountModeStats, 'battles' | 'damageDealt' | 'frags' | 'maxDamage' | 'survived' | 'updatedAt' | 'wins' | 'xp'>;

export type CareerRecordKey = 'maxDamage' | 'maxFrags' | 'maxXp';

export type CareerRecordRef = {
  key: CareerRecordKey;
  value: number;
  tankId: number | null;
};
