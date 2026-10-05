import type { CompetitionBattlesInput } from './competition-battles.types';

import { corroboratedBattle } from '../../mod';

export const competitionBattles = ({ db, accountId, battleTypes, from, until, limit }: CompetitionBattlesInput) =>
  db
    .selectFrom('battle')
    .select([
      'battle.tank_id as tankId',
      'battle.result',
      'battle.damage_dealt as damageDealt',
      'battle.damage_assisted_radio as damageAssistedRadio',
      'battle.damage_assisted_track as damageAssistedTrack',
      'battle.damage_blocked as damageBlocked',
      'battle.frags',
      'battle.spotted',
      'battle.xp',
      'battle.survived'
    ])
    .where('battle.account_id', '=', accountId)
    .where('battle.battle_type', 'in', battleTypes)
    .where('battle.started_at', '>=', from)
    .where('battle.started_at', '<', until)
    .where(corroboratedBattle)
    .orderBy('battle.started_at')
    .limit(limit)
    .execute();

export const COMPETITION_BATTLES_QUERIES = { competitionBattles } as const;
