import type { RngBattlesInput } from './rng-battles.types';

import { corroboratedBattle } from '../../mod';

export const rngBattles = ({ db, watermark, until, limit }: RngBattlesInput) =>
  db
    .selectFrom('battle')
    .select([
      'id',
      'account_id as accountId',
      'tank_id as tankId',
      'started_at as startedAt',
      'received_at as receivedAt',
      'shots',
      'shots_fired as shotsFired',
      'shots_hit as shotsHit',
      'shots_pierced as shotsPierced'
    ])
    .where('shots', 'is not', null)
    .where('received_at', '<', until)
    .$call((query) =>
      watermark ? query.where((eb) => eb(eb.refTuple('received_at', 'id'), '>', eb.tuple(watermark.receivedAt, watermark.id))) : query
    )
    .where(corroboratedBattle)
    .orderBy('received_at')
    .orderBy('id')
    .limit(limit)
    .execute();

export const rngBattlesQueries = { rngBattles } as const;
