import {
  adminClaimListSchema,
  editorialStreamerSchema,
  followStreamerSchema,
  removalRequestSchema,
  resolveClaimSchema,
  startClaimSchema,
  streamerClaimSchema,
  streamerDirectoryQuerySchema,
  streamerDirectorySchema,
  streamerFollowListSchema,
  streamerInvitationListSchema,
  streamerLiveListSchema,
  streamerProfileSchema,
  upsertStreamerProfileSchema
} from '@otmetki/schemas';
import { createZodDto } from 'nestjs-zod';

import { claimStatusResponseSchema } from './profiles.schemas';

export class StreamerProfileDto extends createZodDto(streamerProfileSchema) {}
export class UpsertProfileDto extends createZodDto(upsertStreamerProfileSchema) {}
export class StreamerDirectoryQueryDto extends createZodDto(streamerDirectoryQuerySchema) {}
export class StreamerDirectoryDto extends createZodDto(streamerDirectorySchema) {}
export class StreamerLiveListDto extends createZodDto(streamerLiveListSchema) {}
export class StartClaimDto extends createZodDto(startClaimSchema) {}
export class StreamerClaimDto extends createZodDto(streamerClaimSchema) {}
export class ClaimStatusDto extends createZodDto(claimStatusResponseSchema) {}
export class AdminClaimListDto extends createZodDto(adminClaimListSchema) {}
export class ResolveClaimDto extends createZodDto(resolveClaimSchema) {}
export class RemovalRequestDto extends createZodDto(removalRequestSchema) {}
export class EditorialStreamerDto extends createZodDto(editorialStreamerSchema) {}
export class StreamerInvitationListDto extends createZodDto(streamerInvitationListSchema) {}
export class FollowStreamerDto extends createZodDto(followStreamerSchema) {}
export class StreamerFollowListDto extends createZodDto(streamerFollowListSchema) {}
