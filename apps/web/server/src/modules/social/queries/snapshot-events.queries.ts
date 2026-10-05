import type { RecordEventsInput, TankEventsInput } from './snapshot-events.types';

export const tankEvents = ({ db, accountIds, lookback, since, until, aceMastery }: TankEventsInput) =>
  db
    .selectFrom((eb) =>
      eb
        .selectFrom('tank_snapshot')
        .select(['account_id', 'tank_id', 'captured_at', 'marks_on_gun', 'mark_of_mastery'])
        .select((inner) => [
          inner.fn
            .agg<number | null>('lag', ['marks_on_gun'])
            .over((over) => over.partitionBy(['account_id', 'tank_id']).orderBy('captured_at'))
            .as('prev_marks'),
          inner.fn
            .agg<number | null>('lag', ['mark_of_mastery'])
            .over((over) => over.partitionBy(['account_id', 'tank_id']).orderBy('captured_at'))
            .as('prev_mastery')
        ])
        .where('account_id', 'in', accountIds)
        .where('mode', '=', 'all')
        .where('captured_at', '>=', lookback)
        .where('captured_at', '<', until)
        .as('events')
    )
    .select([
      'account_id as accountId',
      'tank_id as tankId',
      'captured_at as capturedAt',
      'marks_on_gun as marksOnGun',
      'prev_marks as prevMarks',
      'mark_of_mastery as markOfMastery',
      'prev_mastery as prevMastery'
    ])
    .where('captured_at', '>=', since)
    .where((eb) =>
      eb.or([eb('marks_on_gun', '>', eb.ref('prev_marks')), eb.and([eb('mark_of_mastery', '=', aceMastery), eb('prev_mastery', '<', aceMastery)])])
    )
    .orderBy('captured_at', 'desc')
    .execute();

export const recordEvents = ({ db, accountIds, lookback, since, until }: RecordEventsInput) =>
  db
    .selectFrom((eb) =>
      eb
        .selectFrom('account_snapshot')
        .select(['account_id', 'captured_at', 'max_damage', 'max_damage_tank_id'])
        .select((inner) =>
          inner.fn
            .agg<number | null>('lag', ['max_damage'])
            .over((over) => over.partitionBy('account_id').orderBy('captured_at'))
            .as('prev_max_damage')
        )
        .where('account_id', 'in', accountIds)
        .where('mode', '=', 'all')
        .where('captured_at', '>=', lookback)
        .where('captured_at', '<', until)
        .as('records')
    )
    .select([
      'account_id as accountId',
      'captured_at as capturedAt',
      'max_damage as maxDamage',
      'prev_max_damage as prevMaxDamage',
      'max_damage_tank_id as maxDamageTankId'
    ])
    .where('captured_at', '>=', since)
    .where('max_damage', '>', (eb) => eb.ref('prev_max_damage'))
    .orderBy('captured_at', 'desc')
    .execute();

export const SNAPSHOT_EVENTS_QUERIES = { tankEvents, recordEvents } as const;
