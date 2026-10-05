import type { Database } from '../../../../../core';

export type PerBattleColumn = 'damage_dealt' | 'dropped_capture_points' | 'frags' | 'spotted';

export type TankEconomyRowsInput = {
  db: Database;
  since: Date;
};

export type LearningCurveRowsInput = {
  db: Database;
  since: Date;
};

export type TankPercentileRowsInput = {
  db: Database;
  since: Date;
};
