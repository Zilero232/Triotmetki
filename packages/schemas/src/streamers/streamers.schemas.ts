import { z } from 'zod';

import { accountIdSchema, countSchema, httpUrlSchema, isoDateTimeSchema, tankIdSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { PAGINATION } from '../common/query/query.constants';
import { tierSchema, vehicleTypeSchema } from '../vehicles/vehicles.schemas';
import { OVERLAY_THEMES, STREAMER_DIRECTORY, STREAMER_PLATFORMS, STREAMER_PROFILE } from './streamers.constants';

export const overlayKindSchema = z.enum(['session', 'wn8', 'moe', 'damage', 'win_rate', 'win_streak', 'challenge', 'custom']);

export const overlayMetricSchema = z.enum(['battles', 'winRate', 'avgDamage', 'wn8', 'broneIndex', 'moePercent', 'winStreak', 'frags', 'lastBattle']);

export const overlayThemeSchema = z.enum([...OVERLAY_THEMES.standard, ...OVERLAY_THEMES.premium]);

export const overlayConfigSchema = z.object({
  theme: overlayThemeSchema.default(OVERLAY_THEMES.fallback),
  layout: z.enum(['row', 'column', 'grid']).default('row'),
  metrics: z.array(overlayMetricSchema).min(1).max(8),
  accentColor: z
    .string()
    .regex(/^#[\da-f]{6}$/i)
    .optional(),
  fontScale: z.number().min(0.5).max(3).default(1),
  animate: z.boolean().default(true),
  showTank: z.boolean().default(true),
  resetAt: z.enum(['session', 'day', 'manual']).default('session'),
  locale: z.enum(['ru', 'en']).default('ru')
});

export const overlaySchema = z.object({
  id: uuidSchema,
  name: z.string(),
  kind: overlayKindSchema,
  accountId: accountIdSchema.nullable(),
  config: overlayConfigSchema,
  publicUrl: z.url(),
  isPaused: z.boolean(),
  updatedAt: isoDateTimeSchema
});

export const challengeMetricSchema = z.enum(['damage', 'assist', 'blocked', 'frags', 'spotted', 'xp', 'win', 'survive', 'moePercent']);

export const challengeConditionSchema = z.object({
  metric: challengeMetricSchema,
  operator: z.enum(['gte', 'lte', 'eq']).default('gte'),
  value: z.number().nonnegative(),
  battles: z.number().int().min(1).max(20).default(1),
  aggregate: z.enum(['single', 'sum', 'avg']).default('single'),
  tankId: tankIdSchema.optional(),
  tankType: vehicleTypeSchema.optional(),
  minTier: tierSchema.optional()
});

export const challengeStatusSchema = z.enum(['pending', 'active', 'succeeded', 'failed', 'cancelled', 'expired', 'refunded']);

export const challengeSchema = z.object({
  id: uuidSchema,
  title: z.string(),
  condition: challengeConditionSchema,
  amount: z.number().positive(),
  currency: z.string().length(3),
  status: challengeStatusSchema,
  donorName: z.string().nullable(),
  progress: z.object({ battles: countSchema, value: z.number() }).nullable(),
  createdAt: isoDateTimeSchema,
  expiresAt: isoDateTimeSchema.nullable(),
  resolvedAt: isoDateTimeSchema.nullable()
});

export const createChallengeSchema = z.object({
  title: z.string().trim().min(3).max(120),
  condition: challengeConditionSchema,
  amount: z.number().positive(),
  expiresInMinutes: z
    .number()
    .int()
    .min(5)
    .max(24 * 60)
    .default(120)
});

export const streamerPlatformSchema = z.enum(STREAMER_PLATFORMS);

export const streamerProfileKindSchema = z.enum(['claimed', 'editorial']);

export const streamerChannelSchema = z.object({
  platform: streamerPlatformSchema,
  handle: z.string(),
  url: z.url(),
  verified: z.boolean()
});

export const streamerLiveSchema = z.object({
  platform: streamerPlatformSchema,
  viewers: countSchema.nullable(),
  tankId: tankIdSchema.nullable(),
  tankName: z.string().nullable(),
  checkedAt: isoDateTimeSchema.nullable()
});

export const streamerVideoSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.url(),
  publishedAt: isoDateTimeSchema
});

export const streamerProfileSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  kind: streamerProfileKindSchema,
  accountId: accountIdSchema.nullable(),
  accountSourceUrl: z.url().nullable(),
  bio: z.string().nullable(),
  channels: z.array(streamerChannelSchema),
  isLive: z.boolean(),
  live: streamerLiveSchema.nullable(),
  hasSettings: z.boolean(),
  followers: countSchema,
  latestVideos: z.array(streamerVideoSchema)
});

export const streamerChannelInputSchema = z.object({
  platform: streamerPlatformSchema,
  url: httpUrlSchema
});

export const streamerSlugSchema = z.string().trim().toLowerCase().regex(STREAMER_PROFILE.slugPattern);

export const upsertStreamerProfileSchema = z.object({
  slug: streamerSlugSchema,
  displayName: z.string().trim().min(2).max(STREAMER_PROFILE.displayNameMaxLength),
  accountId: accountIdSchema.nullable().optional(),
  bio: z.string().trim().max(STREAMER_PROFILE.bioMaxLength).nullable().optional(),
  channels: z.array(streamerChannelInputSchema).max(STREAMER_PROFILE.channelsMax).optional()
});

export const favouriteTankSchema = z.object({ tankId: tankIdSchema, name: z.string().nullable(), battles: countSchema });

export const streamerCardSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  kind: streamerProfileKindSchema,
  channels: z.array(streamerChannelSchema),
  live: streamerLiveSchema.nullable(),
  stats: z.object({ battles: countSchema, winRate: z.number().nullable(), wn8: z.number().nullable() }).nullable(),
  marks3: countSchema.nullable(),
  favouriteTanks: z.array(favouriteTankSchema),
  hasSettings: z.boolean()
});

export const streamerDirectoryQuerySchema = z.object({
  live: z.stringbool().optional(),
  platform: streamerPlatformSchema.optional(),
  tankId: tankIdSchema.optional(),
  hasSettings: z.stringbool().optional(),
  kind: streamerProfileKindSchema.optional(),
  cursor: z.coerce.number().int().nonnegative().max(PAGINATION.maxOffset).default(0),
  limit: z.coerce.number().int().min(1).max(STREAMER_DIRECTORY.maxLimit).default(STREAMER_DIRECTORY.defaultLimit)
});

export const streamerDirectorySchema = z.object({
  items: z.array(streamerCardSchema),
  nextCursor: z.number().int().nullable(),
  editorialEnabled: z.boolean()
});

export const streamerLiveListSchema = z.array(streamerCardSchema);

export const claimMethodSchema = z.enum(['oauth', 'bio_code', 'manual']);

export const claimStatusSchema = z.enum(['open', 'resolved', 'dismissed']);

export const startClaimSchema = z.object({
  method: claimMethodSchema,
  platform: streamerPlatformSchema.optional(),
  evidence: z.string().trim().max(1000).optional()
});

export const streamerClaimSchema = z.object({
  id: uuidSchema,
  slug: z.string(),
  method: claimMethodSchema,
  status: claimStatusSchema,
  code: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  resolvedAt: isoDateTimeSchema.nullable()
});

export const adminClaimSchema = streamerClaimSchema.extend({ userId: z.string(), evidence: z.string().nullable() });

export const adminClaimListSchema = z.array(adminClaimSchema);

export const resolveClaimSchema = z.object({ approve: z.boolean() });

export const removalRequestSchema = z.object({
  contact: z.string().trim().min(3).max(200),
  reason: z.string().trim().max(1000).optional()
});

export const followStreamerSchema = z.object({ tankId: tankIdSchema.nullable().optional() });

export const streamerFollowSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  tankId: tankIdSchema.nullable(),
  isLive: z.boolean(),
  createdAt: isoDateTimeSchema
});

export const streamerFollowListSchema = z.array(streamerFollowSchema);

export const streamerInvitationSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  status: z.enum(['pending', 'sent', 'accepted', 'declined']),
  channels: z.array(streamerChannelInputSchema),
  sourceUrl: z.url().nullable(),
  sentAt: isoDateTimeSchema.nullable()
});

export const streamerInvitationListSchema = z.array(streamerInvitationSchema);

export const editorialStreamerSchema = z.object({
  slug: streamerSlugSchema,
  displayName: z.string().trim().min(2).max(STREAMER_PROFILE.displayNameMaxLength),
  channels: z
    .array(streamerChannelInputSchema.extend({ sourceUrl: httpUrlSchema }))
    .min(1)
    .max(STREAMER_PROFILE.channelsMax)
});

export const createOverlaySchema = z.object({
  name: z.string().trim().min(1).max(64),
  kind: overlayKindSchema,
  accountId: accountIdSchema.optional(),
  config: overlayConfigSchema
});

export const updateOverlaySchema = createOverlaySchema.partial();

export const previewOverlaySchema = createOverlaySchema.omit({ name: true }).extend({
  name: z.string().trim().max(64).optional()
});

export const overlayListSchema = z.array(overlaySchema);

export const overlayPublicIdSchema = z.string().regex(STREAMER_PROFILE.publicIdPattern);

export const overlayResultSchema = z.enum(['win', 'loss', 'draw']);

export const overlayDataSchema = z.object({
  kind: overlayKindSchema,
  name: z.string(),
  config: overlayConfigSchema,
  isPaused: z.boolean(),
  player: z.object({ accountId: accountIdSchema, nickname: z.string() }).nullable(),
  session: z
    .object({
      battles: z.number().int().nonnegative(),
      wins: z.number().int().nonnegative(),
      winRate: z.number().min(0).max(100).nullable(),
      avgDamage: z.number().nonnegative().nullable(),
      frags: z.number().int().nonnegative(),
      wn8: z.number().nullable(),
      broneIndex: z.number().nullable(),
      winStreak: z.number().int().nonnegative(),
      lastBattle: z.object({ tankId: z.number().int(), tankName: z.string(), result: overlayResultSchema, damage: z.number().int() }).nullable()
    })
    .nullable(),
  overall: z
    .object({ battles: z.number().int(), winRate: z.number().nullable(), wn8: z.number().nullable(), broneIndex: z.number().nullable() })
    .nullable(),
  moe: z.object({ tankName: z.string(), marks: z.number().int(), percent: z.number() }).nullable(),
  challenge: z
    .object({
      title: z.string(),
      code: z.string(),
      status: challengeStatusSchema,
      battles: z.number().int(),
      battlesNeeded: z.number().int(),
      value: z.number(),
      target: z.number()
    })
    .nullable(),
  updatedAt: isoDateTimeSchema
});

export const streamerChallengeSchema = challengeSchema.extend({
  code: z.string()
});

export const challengeListSchema = z.array(streamerChallengeSchema);

export const activateChallengeSchema = z.object({
  donorName: z.string().trim().min(1).max(64).optional()
});

export const streamerProviderSchema = z.enum(['donationAlerts', 'twitch', 'vkPlayLive', 'youtube']);

export const connectableProviderSchema = z.enum(['donation-alerts', 'twitch']);

export const streamerIntegrationSchema = z.object({
  provider: streamerProviderSchema,
  externalId: z.string(),
  login: z.string().nullable(),
  connectedAt: isoDateTimeSchema,
  predictions: z.boolean(),
  canPredict: z.boolean()
});

export const updatePredictionsSchema = z.object({
  enabled: z.boolean()
});

export const twitchChannelParamsSchema = z.object({
  channelId: z.string().regex(/^d{1,20}$/)
});

export const twitchPanelSchema = z.object({
  nickname: z.string().nullable(),
  profileUrl: z.url().nullable(),
  session: z
    .object({
      battles: z.number().int().nonnegative(),
      wins: z.number().int().nonnegative(),
      avgDamage: z.number().nonnegative(),
      wn8: z.number().nullable(),
      startedAt: isoDateTimeSchema,
      isOpen: z.boolean()
    })
    .nullable(),
  marks: z.object({
    moe3: z.number().int().nonnegative(),
    moe2: z.number().int().nonnegative(),
    moe1: z.number().int().nonnegative(),
    closest: z.array(z.object({ tankName: z.string(), marks: z.number().int().min(0).max(3), percent: z.number() }))
  })
});

export const integrationListSchema = z.array(streamerIntegrationSchema);

export const connectUrlSchema = z.object({
  url: z.url()
});
