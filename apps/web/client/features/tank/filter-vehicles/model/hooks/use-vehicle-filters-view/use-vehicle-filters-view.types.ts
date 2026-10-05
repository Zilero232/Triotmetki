import type { TankRole } from '@otmetki/schemas';

import type { ActiveFilter } from '@/ui-kit';

import type { VEHICLE_FILTER_VIEW } from '../../../config';

export type RoleChoice = TankRole | typeof VEHICLE_FILTER_VIEW.anyRole;

export type UseVehicleFiltersViewInput = {
  extraActive?: readonly ActiveFilter[];
  onExtraReset?: () => void;
};

export type FilterChipInput = {
  id: string;
  label: string;
  values: readonly string[];
  onRemove: () => void;
};
