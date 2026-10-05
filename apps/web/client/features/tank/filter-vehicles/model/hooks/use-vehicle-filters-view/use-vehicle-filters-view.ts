'use client';

import type { TankClass } from '@otmetki/icons';
import type { TankRole, TankStatus } from '@otmetki/schemas';

import { TANK_STATUSES } from '@otmetki/schemas';
import { useTranslations } from 'next-intl';

import type { ActiveFilter, SelectItem } from '@/ui-kit';

import { shortList, tierSpanText } from '@/shared/lib';

import type { FilterChipInput, RoleChoice, UseVehicleFiltersViewInput } from './use-vehicle-filters-view.types';

import { VEHICLE_FILTER_VIEW, VEHICLE_TIERS } from '../../../config';
import { rolesForTypes, rolesWithinTypes } from '../../../lib';
import { useVehicleFilters } from '../use-vehicle-filters';

export const useVehicleFiltersView = ({ extraActive = [], onExtraReset }: UseVehicleFiltersViewInput = {}) => {
  const t = useTranslations('tanks.filters');
  const tTraits = useTranslations('tankTraits');
  const tGame = useTranslations('game');
  const tFilters = useTranslations('common.filters');
  const { filters, setFilters, reset } = useVehicleFilters();

  const statusOptions = TANK_STATUSES.map((value) => ({ value, label: tTraits(`status.${value}`) }));
  const roleItems: SelectItem<RoleChoice>[] = [
    { value: VEHICLE_FILTER_VIEW.anyRole, label: tTraits('role.any') },
    ...rolesForTypes(filters.types).map((value: TankRole) => ({ value, label: tTraits(`role.${value}`) }))
  ];

  const chip = ({ id, label, values, onRemove }: FilterChipInput): ActiveFilter[] =>
    values.length === 0
      ? []
      : [{ id, label: tFilters('span', { label, value: shortList({ items: values, max: VEHICLE_FILTER_VIEW.chipItems }) }), onRemove }];

  const active: ActiveFilter[] = [
    ...(filters.tiers.length > 0
      ? [
          {
            id: 'tiers',
            label: tFilters('span', { label: t('tier'), value: tierSpanText({ options: VEHICLE_TIERS, value: filters.tiers }) }),
            onRemove: () => void setFilters({ tiers: null })
          }
        ]
      : []),
    ...chip({
      id: 'types',
      label: t('type'),
      values: filters.types.map((type) => tGame(`classes.${type}`)),
      onRemove: () => void setFilters({ types: null, roles: null })
    }),
    ...chip({
      id: 'nations',
      label: t('nation'),
      values: filters.nations.map((nation) => tGame(`nations.${nation}`)),
      onRemove: () => void setFilters({ nations: null })
    }),
    ...chip({
      id: 'statuses',
      label: tTraits('status.label'),
      values: filters.statuses.map((status) => tTraits(`status.${status}`)),
      onRemove: () => void setFilters({ statuses: null })
    }),
    ...chip({
      id: 'roles',
      label: tTraits('role.label'),
      values: filters.roles.map((role) => tTraits(`role.${role}`)),
      onRemove: () => void setFilters({ roles: null })
    }),
    ...extraActive
  ];

  return {
    filters,
    active,
    statusOptions,
    roleItems,
    role: filters.roles[0] ?? VEHICLE_FILTER_VIEW.anyRole,
    onReset: () => {
      void reset();
      onExtraReset?.();
    },
    onTiersChange: (tiers: number[]) => void setFilters({ tiers: tiers.length > 0 ? tiers : null }),
    onTypesChange: (types: TankClass[]) => {
      const roles = rolesWithinTypes({ roles: filters.roles, types });

      void setFilters({ types: types.length > 0 ? types : null, roles: roles.length > 0 ? roles : null });
    },
    onNationsChange: (nations: typeof filters.nations) => void setFilters({ nations: nations.length > 0 ? nations : null }),
    onStatusesChange: (next: TankStatus[]) => void setFilters({ statuses: next.length > 0 ? next : null }),
    onRoleChange: (next: RoleChoice) => void setFilters({ roles: next === VEHICLE_FILTER_VIEW.anyRole ? null : [next] })
  };
};
