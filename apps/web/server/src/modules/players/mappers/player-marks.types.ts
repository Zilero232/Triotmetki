import type { VehicleSummary } from '@otmetki/schemas';

import type { PlayerTank } from '../../../../generated';
import type { MoeThresholdRecord } from '../../reference';

export type ToPlayerMarkInput = {
  tank: PlayerTank;
  vehicle: VehicleSummary;
  threshold: MoeThresholdRecord | undefined;
  fromBattles: number | undefined;
  fromRating: number | undefined;
};
