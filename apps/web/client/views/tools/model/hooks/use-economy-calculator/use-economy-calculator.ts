'use client';

import type { VehicleSummary } from '@otmetki/schemas';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { economyView, getTankEconomy } from '@/entities/tank/tank';
import { QUERY_KEYS } from '@/shared/constants';

import type { EconomyValues } from './use-economy-calculator.types';

import { ECONOMY } from '../../../config';
import { shellPriceValues } from '../../../lib/calc-defaults';
import { useCalcState } from '../use-calc-state';

export const useEconomyCalculator = () => {
  const [vehicle, setVehicle] = useState<VehicleSummary | null>(null);
  const { values, field, replace } = useCalcState<EconomyValues>({
    ...ECONOMY.defaults,
    ...shellPriceValues(ECONOMY.defaults.tier),
    isPremiumVehicle: false
  });

  const tankId = vehicle?.tankId ?? 0;

  const {
    data: medians,
    isPending: isMediansLoading,
    isError: isMediansError,
    isRefetching: isMediansRetrying,
    refetch: refetchMedians
  } = useQuery({
    queryKey: QUERY_KEYS.tanks.tankEconomy(tankId),
    queryFn: ({ signal }) => getTankEconomy({ tankId, signal }),
    enabled: vehicle !== null
  });

  const economy = vehicle ? (medians ?? null) : null;
  const premium = economy ? economyView({ economy, account: 'premium', withReserve: false }) : null;
  const standard = economy ? economyView({ economy, account: 'standard', withReserve: false }) : null;

  const onTierChange = (tier: number) => replace({ ...values, tier, ...shellPriceValues(tier) });

  const onVehicleChange = (next: VehicleSummary | null) => {
    setVehicle(next);

    if (next) {
      replace({ ...values, tier: next.tier, isPremiumVehicle: next.isPremium, ...shellPriceValues(next.tier) });
    }
  };

  return {
    values,
    field,
    onTierChange,
    vehicle,
    onVehicleChange,
    medians: { premium, standard, windowDays: economy?.windowDays ?? 0 },
    isMediansPending: vehicle !== null && isMediansLoading,
    isMediansError,
    isMediansRetrying,
    retryMedians: () => void refetchMedians()
  };
};
