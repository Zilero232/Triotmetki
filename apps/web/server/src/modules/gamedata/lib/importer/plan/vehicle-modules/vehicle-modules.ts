import type { Price, VehicleSpec } from '@otmetki/gamedata';

import type { CompatibleTanksInput, PriceColumns, VehicleModule } from '../../importer.types';

import { matchesVehicleFilter } from '../../../parsers/vehicle-filter/vehicle-filter';

export const prices = (price: Price | undefined): PriceColumns => {
  if (price?.currency === 'credits') {
    return { priceCredit: price.amount };
  }

  if (price?.currency === 'gold') {
    return { priceGold: price.amount };
  }

  return {};
};

export const vehicleModules = (vehicle: VehicleSpec): VehicleModule[] => [
  ...vehicle.chassis.map((module) => ({ kind: 'chassis' as const, module })),
  ...vehicle.turrets.map((module) => ({ kind: 'turret' as const, module })),
  ...vehicle.turrets.flatMap((turret) => turret.guns.map((module) => ({ kind: 'gun' as const, module }))),
  ...vehicle.engines.map((module) => ({ kind: 'engine' as const, module })),
  ...vehicle.radios.map((module) => ({ kind: 'radio' as const, module }))
];

export const compatibleTanks = ({ filter, vehicles }: CompatibleTanksInput): number[] =>
  vehicles.filter((vehicle) => matchesVehicleFilter({ filter, vehicle })).map((vehicle) => vehicle.tankId);
