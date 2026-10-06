import { romanTier } from '@/entities/replay/replay';

import type { ViewerBattle } from '../viewer-protocol';
import type { BattleResultInput } from './battle-line.types';

export const vehicleLine = (battle: ViewerBattle): string => {
  const tier = romanTier(battle.tier ?? null);

  return tier ? `${tier} ${battle.vehicle}` : battle.vehicle;
};

export const resultLabel = ({ battle, labels }: BattleResultInput): string | null => (battle.result ? (labels[battle.result] ?? null) : null);

export const hitCounts = (battle: ViewerBattle): { received: number; dealt: number } => ({
  received: battle.received ?? 0,
  dealt: battle.dealt ?? 0
});
