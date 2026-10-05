import type { BuildAdvice } from '@otmetki/schemas';

import { isNonNullish } from 'remeda';

import type { ToBuildAdviceInput } from './build-advice.types';

import { recommendLoadout } from '../lib/recommend-loadout/recommend-loadout';

export const toBuildAdvice = ({ tankId, usage }: ToBuildAdviceInput): BuildAdvice => {
  const loadout = recommendLoadout(usage);

  return {
    tankId,
    isEnough: usage.isEnough,
    battles: usage.battles,
    equipment: loadout?.equipment.filter(isNonNullish) ?? [],
    directives: loadout?.directives.filter(isNonNullish) ?? [],
    consumables: loadout?.consumables.filter(isNonNullish) ?? []
  };
};
