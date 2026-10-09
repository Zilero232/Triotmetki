import * as z from 'zod';

import { countSchema, tankIdSchema } from '../common/primitives/primitives.schemas';
import { nationSchema, vehicleSummarySchema } from '../vehicles/vehicles.schemas';

export const techTreeParamsSchema = z.object({
  nation: nationSchema
});

export const techTreeNodeSchema = z.object({
  vehicle: vehicleSummarySchema,
  xp: countSchema.nullable().describe('Experience to research it from its cheapest parent; null for a root or a vehicle bought for gold'),
  credits: countSchema.nullable(),
  gold: countSchema.nullable(),
  parents: z.array(tankIdSchema),
  children: z.array(tankIdSchema)
});

export const techTreeEdgeSchema = z.object({
  from: tankIdSchema,
  to: tankIdSchema,
  xp: countSchema.nullable()
});

export const techTreeSchema = z.object({
  nation: nationSchema,
  nodes: z.array(techTreeNodeSchema),
  edges: z.array(techTreeEdgeSchema)
});
