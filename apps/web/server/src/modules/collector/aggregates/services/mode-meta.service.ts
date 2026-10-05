import { Injectable } from '@nestjs/common';
import { MOD_AGGREGATES, MODE_META, PLAY_MODES } from '@otmetki/schemas';
import { subDays } from 'date-fns';

import type { ModeSqlRow } from '../mappers';

import { bonusTypesOfMode } from '../../../../common/lib';
import { PrismaService } from '../../../../core';
import { MODE_META_AGGREGATE } from '../config';
import { toModeRecord } from '../mappers';

@Injectable()
export class ModeMetaService {
  constructor(private readonly prisma: PrismaService) {}

  async compute() {
    const computedAt = new Date();
    const since = subDays(computedAt, MODE_META_AGGREGATE.windowDays);
    const counts: Record<string, number> = {};

    for (const mode of PLAY_MODES) {
      const types = bonusTypesOfMode(mode);

      const rows = await this.prisma.$queryRaw<ModeSqlRow[]>`
        WITH mod_rows AS (
          SELECT tank_id, account_id, result::text AS result, damage_dealt, xp, frags, survived, 'mod' AS src
          FROM battle
          WHERE battle_type = ANY(${types}::text[]) AND started_at >= ${since}
        ),
        replay_rows AS (
          SELECT r.tank_id, r.account_id, r.result::text AS result, r.damage_dealt, r.xp, r.frags, NULL::boolean AS survived, 'replay' AS src
          FROM replay r
          WHERE r.status = 'parsed'
            AND r.battle_type = ANY(${types}::text[])
            AND r.played_at >= ${since}
            AND r.tank_id IS NOT NULL
            AND r.account_id IS NOT NULL
            AND r.result IS NOT NULL
            AND r.damage_dealt IS NOT NULL
            AND NOT EXISTS (
              SELECT 1 FROM battle b WHERE b.account_id = r.account_id AND b.arena_unique_id = r.arena_unique_id
            )
        ),
        all_rows AS (
          SELECT * FROM mod_rows
          UNION ALL
          SELECT * FROM replay_rows
        )
        SELECT
          COALESCE(tank_id, ${MODE_META.totalTankId})::int AS tank_id,
          count(*)::int AS battles,
          count(DISTINCT account_id)::int AS players,
          count(*) FILTER (WHERE result = 'win')::int AS wins,
          count(*) FILTER (WHERE result <> 'draw')::int AS decided,
          avg(damage_dealt)::float8 AS avg_damage,
          avg(xp)::float8 AS avg_xp,
          avg(frags)::float8 AS avg_frags,
          (avg(CASE WHEN survived IS NULL THEN NULL WHEN survived THEN 1.0 ELSE 0.0 END) * 100)::float8 AS survival_rate,
          count(*) FILTER (WHERE src = 'mod')::int AS mod_battles,
          count(*) FILTER (WHERE src = 'replay')::int AS replay_battles
        FROM all_rows
        GROUP BY GROUPING SETS ((tank_id), ())
        HAVING count(*) >= ${MODE_META_AGGREGATE.minBattles}
          AND count(DISTINCT account_id) >= ${MOD_AGGREGATES.minAccounts}
      `;

      await this.prisma.$transaction([
        this.prisma.modeTankAggregate.deleteMany({ where: { mode } }),
        this.prisma.modeTankAggregate.createMany({
          data: rows.map((row) => toModeRecord({ row, mode, windowDays: MODE_META_AGGREGATE.windowDays, computedAt }))
        })
      ]);

      counts[mode] = rows.length;
    }

    return counts;
  }
}
