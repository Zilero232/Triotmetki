import { streamerChannelInputSchema, streamerClaimSchema } from '@otmetki/schemas';
import { z } from 'zod';

export const claimStatusResponseSchema = z.object({ claim: streamerClaimSchema.nullable() });

export const invitationChannelsSchema = z.array(streamerChannelInputSchema).catch([]);
