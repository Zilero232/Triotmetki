import type { PreviousBattleMarksInput } from './marks-watch.types';

export const previousBattleMarks = ({ db, battleIds, since }: PreviousBattleMarksInput) =>
  db
    .selectFrom((eb) => eb.selectFrom('battle').select(['account_id', 'tank_id']).distinct().where('id', 'in', battleIds).as('pair'))
    .innerJoinLateral(
      (eb) =>
        eb
          .selectFrom('battle as earlier')
          .select('earlier.marks_on_gun')
          .whereRef('earlier.account_id', '=', 'pair.account_id')
          .whereRef('earlier.tank_id', '=', 'pair.tank_id')
          .where('earlier.marks_on_gun', 'is not', null)
          .where('earlier.received_at', '<=', since)
          .orderBy('earlier.started_at', 'desc')
          .limit(1)
          .as('latest'),
      (join) => join.onTrue()
    )
    .select(['pair.account_id as accountId', 'pair.tank_id as tankId', 'latest.marks_on_gun as marksOnGun'])
    .$narrowType<{ marksOnGun: number }>()
    .execute();

export const MARKS_WATCH_QUERIES = { previousBattleMarks } as const;
