import type { TankEconomyAggregate } from '../../../../generated';

export type ToTankEconomyInput = {
  tankId: number;
  rows: readonly TankEconomyAggregate[];
};
