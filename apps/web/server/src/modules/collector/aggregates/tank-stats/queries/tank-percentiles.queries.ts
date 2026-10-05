import { BRONYA_INDEX } from '@otmetki/ratings';

import type { PerBattleColumn, TankPercentileRowsInput } from './tank-stats.types';

import { percentiles } from '../../../../../core';
import { BRONYA_REFERENCE } from '../../../../reference';
import { TANK_PERCENTILES_AGGREGATE } from '../config/tank-stats.constants';

export const tankPercentileRows = ({ db, since }: TankPercentileRowsInput) =>
  db
    .with('latest', (query) =>
      query
        .selectFrom('tank_snapshot_latest')
        .select((eb) => {
          const perBattle = (column: PerBattleColumn) => eb(eb.cast<number>(column, 'float8'), '/', eb.ref('battles'));
          const percent = eb.cast<number>(eb.lit(100), TANK_PERCENTILES_AGGREGATE.percentScale);

          return [
            'tank_id',
            perBattle('damage_dealt').as('damage'),
            eb(eb('wins', '*', percent), '/', eb.ref('battles')).as('win_rate'),
            perBattle('frags').as('frags'),
            perBattle('spotted').as('spotted'),
            perBattle('dropped_capture_points').as('defence')
          ];
        })
        .where('mode', '=', 'random')
        .where('captured_at', '>', since)
        .where('battles', '>=', BRONYA_REFERENCE.minTankBattles)
    )
    .selectFrom('latest')
    .select((eb) => [
      'tank_id',
      eb.fn.countAll<number>().as('players'),
      percentiles({ fractions: BRONYA_INDEX.quantileLevels, column: 'damage' }).as('damage'),
      percentiles({ fractions: BRONYA_INDEX.quantileLevels, column: 'win_rate' }).as('win_rate'),
      percentiles({ fractions: BRONYA_INDEX.quantileLevels, column: 'frags' }).as('frags'),
      percentiles({ fractions: BRONYA_INDEX.quantileLevels, column: 'spotted' }).as('spotted'),
      percentiles({ fractions: BRONYA_INDEX.quantileLevels, column: 'defence' }).as('defence')
    ])
    .groupBy('tank_id')
    .having((eb) => eb.fn.countAll(), '>=', BRONYA_REFERENCE.minPlayers)
    .execute();
