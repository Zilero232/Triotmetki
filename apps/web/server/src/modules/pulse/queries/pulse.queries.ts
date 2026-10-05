import type { ActivityByHourInput } from './pulse.types';

import { moscowHour, moscowWeekday } from '../../../core';

export const activityByHour = ({ db, since, now }: ActivityByHourInput) =>
  db
    .selectFrom('player')
    .select((eb) => [
      moscowWeekday({ column: 'last_battle_at', weekStartsOn: 'monday' }).as('weekday'),
      moscowHour('last_battle_at').as('hour'),
      eb.fn.countAll<number>().as('players')
    ])
    .where('last_battle_at', '>=', since)
    .where('last_battle_at', '<=', now)
    .groupBy(['weekday', 'hour'])
    .execute();

export const PULSE_QUERIES = { activityByHour } as const;
