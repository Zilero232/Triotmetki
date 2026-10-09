import * as z from 'zod';

import { accountIdSchema, tankIdSchema } from '../common/primitives/primitives.schemas';
import { listParam } from '../common/query/query.schemas';
import { playerSummarySchema, recentPeriodsSchema } from '../players/players.schemas';
import { vehicleSummarySchema } from '../vehicles/vehicles.schemas';
import { COMPARE } from './compare.constants';

const distinct = (ids: number[]) => new Set(ids).size === ids.length;

const withinBounds = (max: number) => (ids: number[]) => ids.length >= COMPARE.minItems && ids.length <= max;

export const playerComparisonQuerySchema = z.object({
  accountIds: listParam(accountIdSchema)
    .refine(withinBounds(COMPARE.maxPlayers), { message: `Compare ${COMPARE.minItems} to ${COMPARE.maxPlayers} players` })
    .refine(distinct, { message: 'Players must be distinct' })
});

export const playerComparisonSchema = z.object({
  players: z.array(
    z.object({
      summary: playerSummarySchema,
      recent: recentPeriodsSchema.describe('Every recent period (24h, 7d, 30d, 60d, 1000 battles); pick the one to show client-side')
    })
  ),
  commonTankIds: z.array(tankIdSchema)
});

export const tankComparisonQuerySchema = z.object({
  tankIds: listParam(tankIdSchema)
    .refine(withinBounds(COMPARE.maxTanks), { message: `Compare ${COMPARE.minItems} to ${COMPARE.maxTanks} tanks` })
    .refine(distinct, { message: 'Tanks must be distinct' }),
  profiles: listParam(z.string().min(1)).optional()
});

export const tankComparisonSchema = z.object({
  vehicles: z.array(
    z.object({
      vehicle: vehicleSummarySchema,
      profileId: z.string(),
      specs: z.record(z.string(), z.number().nullable())
    })
  ),
  best: z.record(z.string(), tankIdSchema.nullable())
});
