import type { z } from 'zod';

import type {
  activateChallengeSchema,
  adminClaimSchema,
  challengeConditionSchema,
  challengeMetricSchema,
  challengeStatusSchema,
  claimMethodSchema,
  connectableProviderSchema,
  createChallengeSchema,
  createOverlaySchema,
  editorialStreamerSchema,
  followStreamerSchema,
  overlayConfigSchema,
  overlayDataSchema,
  overlayKindSchema,
  overlayMetricSchema,
  overlaySchema,
  overlayThemeSchema,
  previewOverlaySchema,
  removalRequestSchema,
  startClaimSchema,
  streamerCardSchema,
  streamerChallengeSchema,
  streamerChannelInputSchema,
  streamerChannelSchema,
  streamerClaimSchema,
  streamerDirectorySchema,
  streamerFollowSchema,
  streamerIntegrationSchema,
  streamerInvitationSchema,
  streamerLiveSchema,
  streamerPlatformSchema,
  streamerProfileSchema,
  streamerProviderSchema,
  streamerVideoSchema,
  twitchPanelSchema,
  updateOverlaySchema,
  updatePredictionsSchema,
  upsertStreamerProfileSchema
} from './streamers.schemas';

export type OverlayKind = z.infer<typeof overlayKindSchema>;
export type OverlayMetric = z.infer<typeof overlayMetricSchema>;
export type OverlayConfig = z.infer<typeof overlayConfigSchema>;
export type OverlayTheme = z.infer<typeof overlayThemeSchema>;
export type Overlay = z.infer<typeof overlaySchema>;
export type ChallengeMetric = z.infer<typeof challengeMetricSchema>;
export type ChallengeCondition = z.infer<typeof challengeConditionSchema>;
export type ChallengeStatus = z.infer<typeof challengeStatusSchema>;
export type CreateChallengeInput = z.infer<typeof createChallengeSchema>;
export type StreamerProfile = z.infer<typeof streamerProfileSchema>;
export type UpsertStreamerProfileInput = z.infer<typeof upsertStreamerProfileSchema>;
export type CreateOverlayInput = z.input<typeof createOverlaySchema>;
export type UpdateOverlayInput = z.input<typeof updateOverlaySchema>;
export type PreviewOverlayInput = z.input<typeof previewOverlaySchema>;
export type OverlayData = z.infer<typeof overlayDataSchema>;
export type StreamerChallenge = z.infer<typeof streamerChallengeSchema>;
export type ActivateChallengeInput = z.infer<typeof activateChallengeSchema>;
export type StreamerProvider = z.infer<typeof streamerProviderSchema>;
export type ConnectableProvider = z.infer<typeof connectableProviderSchema>;
export type StreamerIntegration = z.infer<typeof streamerIntegrationSchema>;
export type UpdatePredictionsInput = z.infer<typeof updatePredictionsSchema>;
export type TwitchPanel = z.infer<typeof twitchPanelSchema>;

export type StreamerPlatform = z.infer<typeof streamerPlatformSchema>;
export type StreamerChannel = z.infer<typeof streamerChannelSchema>;
export type StreamerLive = z.infer<typeof streamerLiveSchema>;
export type StreamerVideo = z.infer<typeof streamerVideoSchema>;
export type StreamerChannelInput = z.infer<typeof streamerChannelInputSchema>;
export type StreamerCard = z.infer<typeof streamerCardSchema>;
export type StreamerDirectory = z.infer<typeof streamerDirectorySchema>;
export type ClaimMethod = z.infer<typeof claimMethodSchema>;
export type StartClaimInput = z.infer<typeof startClaimSchema>;
export type StreamerClaim = z.infer<typeof streamerClaimSchema>;
export type AdminClaim = z.infer<typeof adminClaimSchema>;
export type RemovalRequestInput = z.infer<typeof removalRequestSchema>;
export type FollowStreamerInput = z.infer<typeof followStreamerSchema>;
export type StreamerFollow = z.infer<typeof streamerFollowSchema>;
export type StreamerInvitation = z.infer<typeof streamerInvitationSchema>;
export type EditorialStreamerInput = z.infer<typeof editorialStreamerSchema>;
