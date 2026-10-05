import type { VehicleCatalog, VehicleFilter } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { sortBy } from 'remeda';

import { isPreferentialVehicle, VehicleCatalogService } from '../../reference';

@Injectable()
export class VehiclesReaderService {
  constructor(private readonly catalog: VehicleCatalogService) {}

  async list(filter: VehicleFilter): Promise<VehicleCatalog> {
    const entries = await this.catalog.filter(filter);

    return sortBy(
      entries.map((entry) => ({ ...entry.summary, role: entry.role, isPreferential: isPreferentialVehicle(entry.spec) })),
      (vehicle) => vehicle.nation,
      (vehicle) => vehicle.tier,
      (vehicle) => vehicle.name
    );
  }
}
