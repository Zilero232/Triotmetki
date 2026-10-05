import type { ClaimMethod, streamerDirectoryQuerySchema, streamerProfileSchema, upsertStreamerProfileSchema } from '@otmetki/schemas';
import type { z } from 'zod';

import type { StreamerClaim as StreamerClaimRow, StreamerInvitation, StreamerPlatform, StreamerProfile } from '../../../../generated';

export type StreamerProfileView = z.infer<typeof streamerProfileSchema>;
export type UpsertProfileInput = z.infer<typeof upsertStreamerProfileSchema> & { userId: string };
export type StreamerDirectoryQueryView = z.infer<typeof streamerDirectoryQuerySchema>;

type ChannelInput = {
  platform: StreamerPlatform;
  url: string;
  sourceUrl?: string;
};

export type ReplaceChannelsInput = {
  profileId: string;
  channels: readonly ChannelInput[];
};

export type StartClaimRequest = {
  userId: string;
  slug: string;
  method: ClaimMethod;
  platform?: StreamerPlatform;
  evidence?: string;
};

export type SlugOwnerInput = {
  userId: string;
  slug: string;
};

export type ClaimRef = SlugOwnerInput;

export type ResolveClaimRequest = {
  id: string;
  approve: boolean;
  moderatorId: string;
};

export type RemovalRequestInput = {
  slug: string;
  contact: string;
  reason?: string;
  userId: string | null;
};

export type FollowInput = {
  userId: string;
  slug: string;
  tankId?: number | null;
};

export type ClaimTarget = { profile: null; invitation: StreamerInvitation } | { profile: StreamerProfile; invitation: null };

export type ContestedClaimInput = {
  target: ClaimTarget;
  userId: string;
  login: string;
};

export type CompleteClaimInput = {
  claim: StreamerClaimRow;
  verifiedPlatform: StreamerPlatform | null;
  moderatorId: string | null;
};
