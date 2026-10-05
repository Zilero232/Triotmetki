import type { ChangeRowInput } from '../supertest.types';
import type { ToChangeRowsInput } from './change-rows.types';

import { liveValue } from '../lib/live-value/live-value';

export const toChangeRows = ({ tank, stats }: ToChangeRowsInput): ChangeRowInput[] => {
  const base = { tankId: tank.tankId, tankName: tank.name, isNewVehicle: tank.isNewVehicle };

  if (tank.changes.length === 0) {
    return [{ ...base, param: null, label: '', raw: tank.name }];
  }

  return tank.changes.map((change) => ({
    ...base,
    param: change.param,
    label: change.label,
    fromValue: change.from,
    toValue: change.to,
    liveValue: tank.isNewVehicle ? null : liveValue({ param: change.param, label: change.label, stats }),
    unit: change.unit,
    raw: change.raw
  }));
};
