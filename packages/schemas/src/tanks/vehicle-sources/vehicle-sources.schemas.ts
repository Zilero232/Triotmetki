import { z } from 'zod';

import { httpUrlSchema, isoDateTimeSchema, tankIdSchema, uuidSchema } from '../../common/primitives/primitives.schemas';
import { VEHICLE_SOURCE, VEHICLE_SOURCE_KINDS } from './vehicle-sources.constants';

export const vehicleSourceKindSchema = z.enum(VEHICLE_SOURCE_KINDS);

const vehicleSourceEventSchema = z.object({
  slug: z.string(),
  title: z.string(),
  url: z.string().nullable(),
  startsAt: isoDateTimeSchema,
  endsAt: isoDateTimeSchema.nullable()
});

export const vehicleSourceMissionSchema = z.object({
  campaignId: z.number().int().nonnegative(),
  operationId: z.number().int().nonnegative(),
  campaignName: z.string().nullable(),
  operationName: z.string().nullable(),
  isCampaignReward: z.boolean().describe('The tank is the reward for the whole campaign rather than for one operation')
});

export const vehicleSourceSchema = z.object({
  id: uuidSchema,
  kind: vehicleSourceKindSchema,
  title: z.string().nullable(),
  url: z.string().nullable(),
  note: z.string().nullable(),
  startsAt: isoDateTimeSchema.nullable(),
  endsAt: isoDateTimeSchema.nullable(),
  event: vehicleSourceEventSchema.nullable(),
  mission: z.object({ campaignId: z.number().int().nonnegative(), operationId: z.number().int().nonnegative() }).nullable()
});

export const createVehicleSourceSchema = z
  .object({
    tankId: tankIdSchema,
    kind: vehicleSourceKindSchema,
    title: z.string().trim().min(1).max(VEHICLE_SOURCE.titleMax).optional(),
    url: httpUrlSchema.optional(),
    note: z.string().trim().max(VEHICLE_SOURCE.noteMax).optional(),
    startsAt: isoDateTimeSchema.optional(),
    endsAt: isoDateTimeSchema.optional(),
    eventSlug: z.string().min(1).max(200).optional(),
    missionCampaignId: z.number().int().nonnegative().optional(),
    missionOperationId: z.number().int().nonnegative().optional()
  })
  .refine(({ startsAt, endsAt }) => !startsAt || !endsAt || new Date(endsAt) >= new Date(startsAt), {
    message: 'The source must end after it starts',
    path: ['endsAt']
  });

export const vehicleSourceIdParamsSchema = z.object({ id: uuidSchema });
