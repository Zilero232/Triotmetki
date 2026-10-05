import type { CombinedDamageInput } from './player-marks.types';

import { PLAYER_MARKS } from '../config/player-stats.constants';

export const combinedDamage = ({ db, accountId }: CombinedDamageInput) =>
  db
    .selectFrom((eb) =>
      eb
        .selectFrom('battle')
        .select((battle) => [
          'tank_id',
          battle('damage_dealt', '+', battle.fn<number>('greatest', ['damage_assisted_radio', 'damage_assisted_track', 'damage_assisted_stun'])).as(
            'combined'
          ),
          battle.fn
            .agg<number>('row_number')
            .over((window) => window.partitionBy('tank_id').orderBy('started_at', 'desc'))
            .as('position')
        ])
        .where('account_id', '=', accountId)
        .as('recent')
    )
    .select((eb) => ['tank_id', eb.fn.countAll<number>().as('battles'), eb.fn.avg<number>('combined').as('combined')])
    .where('position', '<=', PLAYER_MARKS.combinedDamageBattles)
    .groupBy('tank_id')
    .execute();
