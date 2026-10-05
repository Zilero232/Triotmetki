import type { ExpressionBuilder } from 'kysely';

import type { DB } from '../../../../generated/kysely/database';

import { plusHours } from '../../../core';
import { BATTLE_CORROBORATION } from '../config/ingest.constants';

type BattleScope = ExpressionBuilder<DB, 'battle'>;

type WitnessScope = ExpressionBuilder<DB & { witness: DB['replay'] }, 'battle' | 'witness'>;

const collectorDeltaCoversBattle = (eb: BattleScope) =>
  eb.and([
    eb('battle.battle_type', 'in', BATTLE_CORROBORATION.collectorBattleTypes),
    eb.exists(
      eb
        .selectFrom('tank_battle_delta as corroboration')
        .select(eb.lit(1).as('found'))
        .whereRef('corroboration.account_id', '=', 'battle.account_id')
        .whereRef('corroboration.tank_id', '=', 'battle.tank_id')
        .whereRef('corroboration.captured_at', '>=', 'battle.started_at')
        .where('corroboration.captured_at', '<', plusHours({ column: 'battle.started_at', hours: BATTLE_CORROBORATION.windowHours }))
        .where('corroboration.battles', '>=', 1)
        .whereRef('corroboration.damage_dealt', '>=', 'battle.damage_dealt')
        .whereRef('corroboration.frags', '>=', 'battle.frags')
    )
  ]);

const witnessShowsPlayerDamage = (eb: WitnessScope) =>
  eb.and([
    eb('battle.account_id', '=', eb.fn.any('witness.player_account_ids')),
    eb(eb.fn('jsonb_typeof', [eb.fn('jsonb_extract_path', ['witness.summary', eb.val('players')])]), '=', 'array'),
    eb.exists(
      eb
        .selectFrom(
          eb.fn<{ value: unknown }>('jsonb_array_elements', [eb.fn('jsonb_extract_path', ['witness.summary', eb.val('players')])]).as('seen')
        )
        .select(eb.lit(1).as('found'))
        .where((row) => row(row.fn('jsonb_extract_path_text', ['seen.value', row.val('accountId')]), '=', row.cast('battle.account_id', 'text')))
        .where((row) =>
          row(
            row.cast(row.fn('jsonb_extract_path_text', ['seen.value', row.val('result'), row.val('damageDealt')]), 'numeric'),
            '=',
            row.ref('battle.damage_dealt')
          )
        )
    )
  ]);

const independentReplayShowsBattle = (eb: BattleScope) =>
  eb.exists(
    eb
      .selectFrom('replay as witness')
      .select(eb.lit(1).as('found'))
      .whereRef('witness.arena_unique_id', '=', 'battle.arena_unique_id')
      .where('witness.status', '=', 'parsed')
      .where('witness.uploader_user_id', 'is not', null)
      .where((inner) =>
        inner.not(
          inner.exists(
            inner
              .selectFrom('user_lesta_account as owner')
              .select(inner.lit(1).as('found'))
              .whereRef('owner.user_id', '=', 'witness.uploader_user_id')
              .whereRef('owner.account_id', '=', 'battle.account_id')
          )
        )
      )
      .where((inner) =>
        inner.not(
          inner.exists(
            inner
              .selectFrom('mod_device as reporter')
              .select(inner.lit(1).as('found'))
              .whereRef('reporter.id', '=', 'battle.device_id')
              .whereRef('reporter.user_id', '=', 'witness.uploader_user_id')
          )
        )
      )
      .where((inner) =>
        inner.or([
          inner.and([
            inner('witness.account_id', '=', inner.ref('battle.account_id')),
            inner('witness.damage_dealt', '=', inner.ref('battle.damage_dealt'))
          ]),
          witnessShowsPlayerDamage(inner)
        ])
      )
  );

export const corroboratedBattle = (eb: BattleScope) => eb.or([collectorDeltaCoversBattle(eb), independentReplayShowsBattle(eb)]);

export const ownerTrustedBattle = (eb: BattleScope) =>
  eb.or([eb('battle.battle_type', 'not in', BATTLE_CORROBORATION.collectorBattleTypes), corroboratedBattle(eb)]);
