import type { PlaytimeFromBattlesInput, PlaytimeFromDeltasInput } from './playtime.types';

import { moscowHour, moscowWeekday, statSums } from '../../../core';
import { accountDeltas } from './player-history.queries';

export const playtimeFromBattles = ({ db, accountId, from, weekStartsOn, battleType }: PlaytimeFromBattlesInput) =>
  db
    .selectFrom('battle')
    .select((eb) => [
      moscowWeekday({ column: 'started_at', weekStartsOn }).as('weekday'),
      moscowHour('started_at').as('hour'),
      eb.fn.countAll<number>().as('battles'),
      eb.fn.countAll<number>().filterWhere('result', '=', 'win').as('wins'),
      eb.fn.sum<number>('damage_dealt').as('damage')
    ])
    .where('account_id', '=', accountId)
    .where('started_at', '>=', from)
    .$call((query) => (battleType === undefined ? query : query.where('battle_type', '=', battleType)))
    .groupBy(['weekday', 'hour'])
    .execute();

export const playtimeFromDeltas = ({ weekStartsOn, ...window }: PlaytimeFromDeltasInput) =>
  accountDeltas(window)
    .select(moscowWeekday({ column: 'captured_at', weekStartsOn }).as('weekday'))
    .select(moscowHour('captured_at').as('hour'))
    .select(statSums(['battles', 'wins', 'damage']))
    .groupBy(['weekday', 'hour'])
    .execute();
