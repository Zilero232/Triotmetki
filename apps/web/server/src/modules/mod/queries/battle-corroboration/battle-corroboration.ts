import { Prisma } from '../../../../../generated';
import { BATTLE_CORROBORATION } from '../../config';

export const corroboratedBattleSql = Prisma.sql`(
  (
    b.battle_type = ANY(${BATTLE_CORROBORATION.collectorBattleTypes}::text[])
    AND EXISTS (
      SELECT 1
      FROM tank_battle_delta corroboration
      WHERE corroboration.account_id = b.account_id
        AND corroboration.tank_id = b.tank_id
        AND corroboration.captured_at >= b.started_at
        AND corroboration.captured_at < b.started_at + make_interval(hours => ${BATTLE_CORROBORATION.windowHours})
        AND corroboration.battles >= 1
        AND corroboration.damage_dealt >= b.damage_dealt
        AND corroboration.frags >= b.frags
    )
  )
  OR EXISTS (
    SELECT 1
    FROM replay witness
    WHERE witness.arena_unique_id = b.arena_unique_id
      AND witness.status = 'parsed'
      AND witness.uploader_user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM user_lesta_account owner
        WHERE owner.user_id = witness.uploader_user_id AND owner.account_id = b.account_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM mod_device reporter
        WHERE reporter.id = b.device_id AND reporter.user_id = witness.uploader_user_id
      )
      AND (
        (witness.account_id = b.account_id AND witness.damage_dealt = b.damage_dealt)
        OR (
          b.account_id = ANY(witness.player_account_ids)
          AND jsonb_typeof(witness.summary->'players') = 'array'
          AND EXISTS (
            SELECT 1
            FROM jsonb_array_elements(witness.summary->'players') AS seen
            WHERE seen->>'accountId' = b.account_id::text
              AND (seen->'result'->>'damageDealt')::numeric = b.damage_dealt
          )
        )
      )
  )
)`;

export const ownerTrustedBattleSql = Prisma.sql`(
  b.battle_type <> ALL(${BATTLE_CORROBORATION.collectorBattleTypes}::text[])
  OR ${corroboratedBattleSql}
)`;
