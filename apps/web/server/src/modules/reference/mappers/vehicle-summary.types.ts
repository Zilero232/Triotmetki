import type { TankStatus } from '@otmetki/schemas';

import type { Vehicle } from '../../../../generated';

export type VehicleRow = Pick<
  Vehicle,
  'images' | 'isCollectible' | 'isPremium' | 'name' | 'nation' | 'shortName' | 'slug' | 'tag' | 'tankId' | 'tier' | 'type'
>;

export type ToVehicleSummaryInput = {
  row: VehicleRow;
  status: TankStatus;
};

export type ReadUrlInput = {
  images: unknown;
  keys: readonly string[];
};
