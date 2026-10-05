import type { VehicleSummary } from '@otmetki/schemas';

import type { Battle } from '../../../../generated';

export type MyBattleInput = {
  battle: Battle;
  vehicle: VehicleSummary | null;
  mapName: string | null;
};
