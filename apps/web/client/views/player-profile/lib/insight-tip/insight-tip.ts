import { TIERS, toRoman } from '@otmetki/icons';

import type { TipValues, TipValuesInput } from './insight-tip.types';

import { INSIGHT_TIP } from '../../config';

const numberParam = (value: number | string | undefined) => (typeof value === 'number' ? value : Number(value ?? 0));

export const tipValues = ({ tip, insights }: TipValuesInput): TipValues => {
  const { params } = tip;
  const vehicles = [...insights.weakTanks, ...insights.strongTanks].map(({ vehicle }) => vehicle);
  const tank = vehicles.find(({ tankId }) => tankId === numberParam(params.tankId));
  const tier = TIERS.find((value) => value === numberParam(params.tier));

  return {
    ...params,
    winRateDelta: Math.abs(numberParam(params.winRateDelta)),
    damageRatio: Math.round(numberParam(params.damageRatio) * INSIGHT_TIP.ratioPercent),
    tank: tank?.shortName ?? tank?.name ?? '—',
    tierRoman: tier ? toRoman(tier) : String(params.tier ?? '')
  };
};
