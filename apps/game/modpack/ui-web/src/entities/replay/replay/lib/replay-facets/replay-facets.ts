import { countBy, sortBy, uniqueBy } from 'remeda';

import type { ReplayItem } from '../../model/schemas';
import type { ReplayFacets } from './replay-facets.types';

import { REPLAYS } from '../../config';

type WithMap = ReplayItem & { map: string };
type WithVehicle = ReplayItem & { vehicle: string };
type WithTier = ReplayItem & { tier: number };

export const replayFacets = (items: readonly ReplayItem[]): ReplayFacets => {
  const withMap = items.filter((item): item is WithMap => item.map !== null);
  const withVehicle = items.filter((item): item is WithVehicle => item.vehicle !== null);
  const withTier = items.filter((item): item is WithTier => item.tier !== null);
  const mapCounts = countBy(withMap, (item) => item.map);
  const vehicleCounts = countBy(withVehicle, (item) => item.vehicle);
  const tierCounts = countBy(withTier, (item) => String(item.tier));
  const typeCounts = countBy(items, (item) => item.type);
  const nationCounts = countBy(items, (item) => item.nation ?? '');

  return {
    maps: sortBy(
      uniqueBy(withMap, (item) => item.map).map((item) => ({ value: item.map, label: item.map_title ?? item.map, count: mapCounts[item.map] ?? 0 })),
      (option) => option.label.toLowerCase()
    ),
    vehicles: sortBy(
      uniqueBy(withVehicle, (item) => item.vehicle).map((item) => ({
        value: item.vehicle,
        label: item.tank ?? item.vehicle,
        tier: item.tier,
        count: vehicleCounts[item.vehicle] ?? 0
      })),
      [(option) => option.count, 'desc'],
      (option) => option.label.toLowerCase()
    ),
    tiers: sortBy(
      uniqueBy(withTier, (item) => item.tier).map((item) => ({
        value: item.tier,
        label: String(item.tier),
        count: tierCounts[String(item.tier)] ?? 0
      })),
      (option) => option.value
    ),
    types: REPLAYS.battleTypes
      .filter((type) => (typeCounts[type] ?? 0) > 0)
      .map((type) => ({ value: type, label: type, count: typeCounts[type] ?? 0 })),
    nations: REPLAYS.nations
      .filter((nation) => (nationCounts[nation] ?? 0) > 0)
      .map((nation) => ({ value: nation, label: nation, count: nationCounts[nation] ?? 0 }))
  };
};
