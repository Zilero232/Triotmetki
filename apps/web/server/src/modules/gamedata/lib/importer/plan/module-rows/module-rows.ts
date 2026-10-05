import type { ModuleBase, VehicleSpec } from '@otmetki/gamedata';

import { unique } from 'remeda';

import type { ModuleRow, VehicleModule } from '../../importer.types';

import { MODULE_TYPE } from '../../importer.constants';
import { vehicleModules } from '../vehicle-modules/vehicle-modules';

const moduleData = ({ kind, module }: VehicleModule): Record<string, unknown> => {
  if (kind === 'turret' && 'guns' in module && Array.isArray(module.guns)) {
    return { ...module, guns: module.guns.map((gun: ModuleBase) => gun.name) };
  }

  return { ...module };
};

export const buildModuleRows = (vehicles: VehicleSpec[]): ModuleRow[] => {
  const rows = new Map<number, ModuleRow>();

  for (const vehicle of vehicles) {
    for (const { kind, module } of vehicleModules(vehicle)) {
      if (module.moduleId < 0) {
        continue;
      }

      const existing = rows.get(module.moduleId);

      if (existing) {
        existing.tankIds = unique([...existing.tankIds, vehicle.tankId]);

        continue;
      }

      rows.set(module.moduleId, {
        moduleId: module.moduleId,
        name: module.displayName,
        type: MODULE_TYPE[kind],
        nation: vehicle.nation,
        tier: module.tier ?? vehicle.tier,
        priceCredit: module.price?.currency === 'credits' ? module.price.amount : undefined,
        weight: module.weight,
        tankIds: [vehicle.tankId],
        data: moduleData({ kind, module })
      });
    }
  }

  return [...rows.values()];
};
