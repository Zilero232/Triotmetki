import type { ChallengeBattlesInput } from './weekly-challenge.types';

import { corroboratedBattle } from '../../mod';

export const challengeBattles = ({ db, accountIds, start, end }: ChallengeBattlesInput) =>
  db
    .selectFrom('battle')
    .select(['battle.account_id as accountId', 'battle.tank_id as tankId', 'battle.damage_dealt as damageDealt'])
    .where('battle.account_id', 'in', accountIds)
    .where('battle.started_at', '>=', start)
    .where('battle.started_at', '<', end)
    .where(corroboratedBattle)
    .execute();

export const WEEKLY_CHALLENGE_QUERIES = { challengeBattles } as const;
