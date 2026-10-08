'use client';

import type { VehicleSummary } from '@otmetki/schemas';

import { useQueryStates } from 'nuqs';

import { useArmorModel } from '@/entities/armor/armor-model';
import { useVehicleCatalog } from '@/features/tank/pick-tank';

import type { UseArmorCompareInput } from './use-armor-compare.types';

import { TANK_ARMOR_URL_PARSERS } from '../../../config';
import { compareArmorSlug, findArmorVehicle } from '../../../lib/armor-vehicle';
import { compareStatus } from '../../../lib/compare-status';

export const useArmorCompare = ({ slug, modelTankId, enabled }: UseArmorCompareInput) => {
  const [{ vs }, setParams] = useQueryStates(TANK_ARMOR_URL_PARSERS, { history: 'replace' });
  const { data: vehicles } = useVehicleCatalog();

  const primary = findArmorVehicle({ vehicles, idOrSlug: slug });
  const primaryId = primary?.tankId ?? modelTankId;
  const compareSlug = compareArmorSlug({ vs, slug, primaryId, vehicles });

  const query = useArmorModel({ idOrSlug: compareSlug ?? '', enabled: enabled && compareSlug !== null });

  const vehicle = findArmorVehicle({ vehicles, idOrSlug: compareSlug ?? '' });
  const status = compareStatus({ hasData: query.data !== undefined, error: query.error });

  const onPick = (picked: VehicleSummary | null) => void setParams({ vs: picked?.slug ?? null });

  return {
    slug: compareSlug,
    name: vehicle?.name ?? query.data?.response.vehicle.name ?? compareSlug ?? '',
    vehicle,
    model: query.data,
    status,
    fetchStatus: query.fetchStatus,
    excludeIds: primaryId === undefined ? [] : [primaryId],
    retry: () => void query.refetch(),
    onPick,
    onClear: () => onPick(null)
  };
};
