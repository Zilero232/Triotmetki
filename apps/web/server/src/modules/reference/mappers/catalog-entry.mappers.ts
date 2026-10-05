import type { CatalogEntry } from '../reference.types';
import type { ToCatalogEntryInput } from './catalog-entry.types';

import { classifyVehicle, readSpecTraits, toTankRole } from '../lib/vehicle-status/vehicle-status';
import { toVehicleSummary } from './vehicle-summary.mappers';

export const toCatalogEntry = ({ row, hasOffers }: ToCatalogEntryInput): CatalogEntry => {
  const spec = readSpecTraits(row.specs);
  const status = classifyVehicle({ summary: row, spec, hasOffers });

  return {
    summary: toVehicleSummary({ row, status }),
    dbType: row.type,
    specs: row.specs,
    description: row.description,
    role: toTankRole(spec.role),
    spec,
    hasOffers
  };
};
