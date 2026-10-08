import type { VehicleSummary } from '@otmetki/schemas';

export type FindArmorVehicleInput = {
  vehicles: VehicleSummary[] | undefined;
  idOrSlug: string;
};

export type CompareArmorSlugInput = {
  vs: string | null;
  slug: string;
  primaryId: number | undefined;
  vehicles: VehicleSummary[] | undefined;
};
