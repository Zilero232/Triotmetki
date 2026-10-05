import type {
  AccountSnapshotWindowInput,
  ReplaceAccountRatingsInput,
  ReplaceAccountTankRatingsInput,
  TankBoundaryInput,
  ToRatingValuesInput,
  ToTankRatingValuesInput
} from './account-ratings.types';

import { RatingPeriod } from '../../../../../../generated/kysely/enums';
import { ACCOUNT_RATING_CHANGE_COLUMNS, ACCOUNT_TANK_RATING_CHANGE_COLUMNS } from '../config/player-ratings.constants';

const toRatingValues = ({ accountId, row }: ToRatingValuesInput) => ({
  account_id: accountId,
  period: RatingPeriod[row.period],
  battles: row.battles,
  win_rate: row.winRate,
  avg_damage: row.avgDamage,
  avg_frags: row.avgFrags,
  avg_tier: row.avgTier ?? null,
  wn8: row.wn8 ?? null,
  eff: row.eff ?? null,
  brone_index: row.broneIndex ?? null,
  from_captured_at: row.fromCapturedAt ?? null,
  to_captured_at: row.toCapturedAt ?? null
});

const toTankRatingValues = ({ accountId, row }: ToTankRatingValuesInput) => ({
  account_id: accountId,
  tank_id: row.tankId,
  period: RatingPeriod[row.period],
  battles: row.battles,
  win_rate: row.winRate,
  avg_damage: row.avgDamage,
  avg_frags: row.avgFrags,
  avg_xp: row.avgXp,
  wn8: row.wn8 ?? null,
  damage_percentile: row.damagePercentile ?? null
});

export const accountSnapshotWindow = ({ db, accountId, mode, since, battles }: AccountSnapshotWindowInput) =>
  db
    .with(
      (cte) => cte('history').notMaterialized(),
      (query) => query.selectFrom('account_snapshot').select(['captured_at', 'battles']).where('account_id', '=', accountId).where('mode', '=', mode)
    )
    .selectFrom('history')
    .select(['captured_at as capturedAt', 'battles'])
    .where((eb) => {
      const latestBattles = eb.selectFrom('history').select('battles').orderBy('captured_at', 'desc').limit(1);

      return eb.or([
        eb('captured_at', '>', since),
        eb(
          'captured_at',
          '=',
          eb
            .selectFrom('history')
            .select((inner) => inner.fn.max('captured_at').as('edge'))
            .where('captured_at', '<=', since)
        ),
        eb(
          'captured_at',
          '=',
          eb
            .selectFrom('history')
            .select((inner) => inner.fn.max('captured_at').as('start'))
            .where('battles', '<=', eb(latestBattles, '-', battles))
        ),
        eb(
          'captured_at',
          '=',
          eb.selectFrom('history').select((inner) => inner.fn.min('captured_at').as('first'))
        )
      ]);
    })
    .orderBy('captured_at')
    .execute();

export const tankBoundary = ({ db, accountId, mode, cutoff }: TankBoundaryInput) =>
  db
    .selectFrom('tank_snapshot')
    .distinctOn('tank_id')
    .select([
      'tank_id as tankId',
      'captured_at as capturedAt',
      'battles',
      'wins',
      'losses',
      'damage_dealt as damageDealt',
      'damage_received as damageReceived',
      'frags',
      'spotted',
      'xp',
      'survived_battles as survived',
      'hits',
      'shots',
      'capture_points as capturePoints',
      'dropped_capture_points as droppedCapturePoints'
    ])
    .where('account_id', '=', accountId)
    .where('mode', '=', mode)
    .where('captured_at', '<=', cutoff)
    .orderBy('tank_id')
    .orderBy('captured_at', 'desc')
    .execute();

export const replaceAccountRatings = async ({ db, accountId, rows }: ReplaceAccountRatingsInput) => {
  const values = rows.map((row) => toRatingValues({ accountId, row }));

  if (values.length > 0) {
    await db
      .insertInto('account_rating')
      .values(values)
      .onConflict((conflict) =>
        conflict
          .columns(['account_id', 'period'])
          .doUpdateSet((eb) => ({
            battles: eb.ref('excluded.battles'),
            win_rate: eb.ref('excluded.win_rate'),
            avg_damage: eb.ref('excluded.avg_damage'),
            avg_frags: eb.ref('excluded.avg_frags'),
            avg_tier: eb.ref('excluded.avg_tier'),
            wn8: eb.ref('excluded.wn8'),
            eff: eb.ref('excluded.eff'),
            brone_index: eb.ref('excluded.brone_index'),
            from_captured_at: eb.ref('excluded.from_captured_at'),
            to_captured_at: eb.ref('excluded.to_captured_at'),
            computed_at: eb.ref('excluded.computed_at')
          }))
          .where((eb) =>
            eb.or(ACCOUNT_RATING_CHANGE_COLUMNS.map((column) => eb(`account_rating.${column}`, 'is distinct from', eb.ref(`excluded.${column}`))))
          )
      )
      .execute();
  }

  await db
    .deleteFrom('account_rating')
    .where('account_id', '=', accountId)
    .$if(values.length > 0, (query) =>
      query.where(
        'period',
        'not in',
        values.map((value) => value.period)
      )
    )
    .execute();
};

export const replaceAccountTankRatings = async ({ db, accountId, rows }: ReplaceAccountTankRatingsInput) => {
  const values = rows.map((row) => toTankRatingValues({ accountId, row }));

  if (values.length > 0) {
    await db
      .insertInto('account_tank_rating')
      .values(values)
      .onConflict((conflict) =>
        conflict
          .columns(['account_id', 'tank_id', 'period'])
          .doUpdateSet((eb) => ({
            battles: eb.ref('excluded.battles'),
            win_rate: eb.ref('excluded.win_rate'),
            avg_damage: eb.ref('excluded.avg_damage'),
            avg_frags: eb.ref('excluded.avg_frags'),
            avg_xp: eb.ref('excluded.avg_xp'),
            wn8: eb.ref('excluded.wn8'),
            damage_percentile: eb.ref('excluded.damage_percentile'),
            computed_at: eb.ref('excluded.computed_at')
          }))
          .where((eb) =>
            eb.or(
              ACCOUNT_TANK_RATING_CHANGE_COLUMNS.map((column) =>
                eb(`account_tank_rating.${column}`, 'is distinct from', eb.ref(`excluded.${column}`))
              )
            )
          )
      )
      .execute();
  }

  await db
    .deleteFrom('account_tank_rating')
    .where('account_id', '=', accountId)
    .$if(values.length > 0, (query) =>
      query.where((eb) =>
        eb(
          eb.refTuple('tank_id', 'period'),
          'not in',
          values.map((value) => eb.tuple(value.tank_id, value.period))
        )
      )
    )
    .execute();
};
