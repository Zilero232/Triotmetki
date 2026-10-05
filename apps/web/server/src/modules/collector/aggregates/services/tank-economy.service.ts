import { Injectable } from '@nestjs/common';
import { MOD_AGGREGATES } from '@otmetki/schemas';
import { subDays } from 'date-fns';

import type { EconomySqlRow } from '../mappers';

import { PrismaService } from '../../../../core';
import { TANK_ECONOMY_AGGREGATE } from '../config';
import { toEconomyRecord } from '../mappers';

@Injectable()
export class TankEconomyService {
  constructor(private readonly prisma: PrismaService) {}

  async compute() {
    const computedAt = new Date();
    const since = subDays(computedAt, TANK_ECONOMY_AGGREGATE.windowDays);
    const { median, minBattles, randomBattleType } = TANK_ECONOMY_AGGREGATE;

    const rows = await this.prisma.$queryRaw<EconomySqlRow[]>`
      WITH mod_rows AS (
        SELECT
          tank_id, account_id, credits, credits_gross, repair_cost, ammo_cost, consumables_cost, xp, free_xp, is_premium_account
        FROM battle
        WHERE battle_type = ${randomBattleType} AND started_at >= ${since} AND credits IS NOT NULL
      ),
      replay_rows AS (
        SELECT
          r.tank_id,
          r.account_id,
          (jsonb_path_query_first(r.summary, '$.players[*] ? (@.isRecorder == true).result.credits') #>> '{}')::float8::int AS credits,
          NULL::int AS credits_gross,
          NULL::int AS repair_cost,
          NULL::int AS ammo_cost,
          NULL::int AS consumables_cost,
          r.xp,
          NULL::int AS free_xp,
          NULL::boolean AS is_premium_account
        FROM replay r
        WHERE r.status = 'parsed'
          AND r.battle_type = ${randomBattleType}
          AND r.played_at >= ${since}
          AND r.tank_id IS NOT NULL
          AND r.account_id IS NOT NULL
          AND r.xp IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM battle b WHERE b.account_id = r.account_id AND b.arena_unique_id = r.arena_unique_id
          )
      ),
      all_rows AS (
        SELECT * FROM mod_rows
        UNION ALL
        SELECT * FROM replay_rows WHERE credits IS NOT NULL
      ),
      tagged AS (
        SELECT *, 'all'::economy_account AS account FROM all_rows
        UNION ALL
        SELECT *, (CASE WHEN is_premium_account THEN 'premium' ELSE 'standard' END)::economy_account AS account
        FROM all_rows
        WHERE is_premium_account IS NOT NULL
      )
      SELECT
        tank_id,
        account,
        count(*)::int AS battles,
        count(DISTINCT account_id)::int AS players,
        count(*) FILTER (WHERE repair_cost IS NOT NULL AND ammo_cost IS NOT NULL AND consumables_cost IS NOT NULL)::int AS cost_battles,
        percentile_cont(${median}::float8) WITHIN GROUP (ORDER BY credits) AS credits,
        percentile_cont(${median}::float8) WITHIN GROUP (ORDER BY credits_gross) AS credits_base,
        percentile_cont(${median}::float8) WITHIN GROUP (ORDER BY repair_cost) AS repair,
        percentile_cont(${median}::float8) WITHIN GROUP (ORDER BY ammo_cost) AS ammo,
        percentile_cont(${median}::float8) WITHIN GROUP (ORDER BY consumables_cost) AS consumables,
        percentile_cont(${median}::float8) WITHIN GROUP (ORDER BY credits - repair_cost - ammo_cost - consumables_cost) AS net,
        percentile_cont(${median}::float8) WITHIN GROUP (ORDER BY xp) AS xp,
        percentile_cont(${median}::float8) WITHIN GROUP (ORDER BY free_xp) AS free_xp
      FROM tagged
      GROUP BY tank_id, account
      HAVING count(*) >= ${minBattles}
        AND count(DISTINCT account_id) >= ${MOD_AGGREGATES.minAccounts}
    `;

    await this.prisma.$transaction([
      this.prisma.tankEconomyAggregate.deleteMany({}),
      this.prisma.tankEconomyAggregate.createMany({
        data: rows.map((row) => toEconomyRecord({ row, windowDays: TANK_ECONOMY_AGGREGATE.windowDays, computedAt }))
      })
    ]);

    return { rows: rows.length };
  }
}
