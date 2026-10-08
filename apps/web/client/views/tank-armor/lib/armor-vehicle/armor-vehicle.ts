import type { VehicleSummary } from '@otmetki/schemas';

import type { CompareArmorSlugInput, FindArmorVehicleInput } from './armor-vehicle.types';

import { ARMOR_ROUTE } from '../../config';

const isNumericId = (idOrSlug: string): boolean => ARMOR_ROUTE.numericId.test(idOrSlug);

export const findArmorVehicle = ({ vehicles, idOrSlug }: FindArmorVehicleInput): VehicleSummary | null => {
  if (!vehicles) {
    return null;
  }

  const bySlug = vehicles.find((vehicle) => vehicle.slug === idOrSlug);

  if (bySlug || !isNumericId(idOrSlug)) {
    return bySlug ?? null;
  }

  const tankId = Number(idOrSlug);

  return vehicles.find((vehicle) => vehicle.tankId === tankId) ?? null;
};

export const compareArmorSlug = ({ vs, slug, primaryId, vehicles }: CompareArmorSlugInput): string | null => {
  if (!vs) {
    return null;
  }

  const compared = findArmorVehicle({ vehicles, idOrSlug: vs });

  if (compared && primaryId !== undefined) {
    return compared.tankId === primaryId ? null : vs;
  }

  return vs === slug ? null : vs;
};
