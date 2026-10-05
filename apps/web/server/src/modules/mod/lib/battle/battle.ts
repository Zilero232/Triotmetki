import type { BattleResultEvent } from '../contract/contract.types';
import type { SessionIncrement, SessionUuidInput } from './battle.types';

import { stableUuid } from '../../../../common/lib';
import { BATTLE } from './battle.constants';

export const sessionUuid = ({ accountId, sessionId }: SessionUuidInput): string => stableUuid(`${accountId}:${sessionId}`);

export const platoonSizeOf = (platoon: BattleResultEvent['platoon']): number | null => {
  if (platoon === undefined) {
    return null;
  }

  return platoon?.size ?? BATTLE.soloPlatoonSize;
};

export const moePercent = (damageRating: number): number => damageRating / BATTLE.damageRatingScale;

export const sessionIncrement = (event: BattleResultEvent): SessionIncrement => {
  const { stats } = event;

  return {
    battles: 1,
    wins: event.result === 'win' ? 1 : 0,
    losses: event.result === 'loss' ? 1 : 0,
    draws: event.result === 'draw' ? 1 : 0,
    damageDealt: stats.damage_dealt,
    damageAssisted: stats.damage_assisted_radio + stats.damage_assisted_track,
    damageBlocked: stats.damage_blocked,
    frags: stats.frags,
    spotted: stats.spotted,
    xp: stats.xp,
    survived: stats.is_alive ? 1 : 0,
    credits: stats.factual_credits
  };
};

export const countsForSession = (event: BattleResultEvent): boolean => event.session_id !== null && event.bonus_type === BATTLE.randomBonusType;
