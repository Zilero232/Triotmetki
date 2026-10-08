'use client';

import { useTanksFilterContext } from '../../context';
import { usePlayerTanks } from '../use-profile-queries';

export const useTanksTab = () => {
  const { request, matches } = useTanksFilterContext();
  const query = usePlayerTanks(request);

  const rows = query.data?.items.filter(({ vehicle }) => matches(vehicle.name)) ?? [];

  return {
    query,
    rows,
    total: query.data ? rows.length : null
  };
};
