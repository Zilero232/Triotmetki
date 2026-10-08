import { z } from 'zod';

import { accountIdSchema, countSchema, isoDateTimeSchema, percentSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { ratingValueSchema } from '../common/rating/rating.schemas';
import { goalSchema } from '../me/me.schemas';
import { replayStatusSchema } from '../replays/replays.schemas';
import { sessionKindSchema, sessionSourceSchema } from '../sessions/sessions.schemas';
import { MOD_BADGES, MOD_ERROR_CODES, MOD_HANGAR, MOD_LOADOUT, MOD_RATINGS } from './mod.constants';

export const bindCodeInputSchema = z.object({
  accountId: accountIdSchema.optional()
});

export const bindCodeSchema = z.object({
  code: z.string(),
  accountId: z.number().int().positive().nullable(),
  expiresAt: isoDateTimeSchema
});

export const modDeviceSchema = z.object({
  id: z.string(),
  accountId: z.number().int().positive().nullable(),
  name: z.string().nullable(),
  modVersion: z.string().nullable(),
  gameVersion: z.string().nullable(),
  lastSeenAt: isoDateTimeSchema.nullable(),
  revokedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema
});

export const modDevicesSchema = z.array(modDeviceSchema);

const itemId = z.number().int().min(1);
const gameTag = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[\w.-]+$/);

export const modBattleLoadoutSchema = z
  .strictObject({
    optional_devices: z.array(itemId.nullable()).max(MOD_LOADOUT.optionalDevices),
    consumables: z.array(itemId.nullable()).max(MOD_LOADOUT.consumables),
    directives: z.array(itemId.nullable()).max(MOD_LOADOUT.directives),
    shells: z.array(z.strictObject({ shell_id: itemId, count: z.number().int().min(0).max(MOD_LOADOUT.shellCount) })).max(MOD_LOADOUT.shells),
    field_modifications: z.array(gameTag).max(MOD_LOADOUT.fieldModifications),
    crew: z.array(z.strictObject({ role: gameTag, skills: z.array(gameTag).max(MOD_LOADOUT.skillsPerMember) })).max(MOD_LOADOUT.crewMembers),
    gameplay_id: z.number().int().min(0).max(MOD_LOADOUT.gameplayId).nullable()
  })
  .describe(
    'The own vehicle loadout of one battle: item compact descriptors per slot, loaded shells, field modification names and crew skills in learning order'
  );

export const modErrorCodeSchema = z.enum(MOD_ERROR_CODES);

export const modDeviceIdSchema = z.string().min(1).max(MOD_RATINGS.deviceIdMaxLength).regex(MOD_RATINGS.deviceIdPattern);

const modAccountIdSchema = z.number().int().positive();
const modTankIdSchema = z.number().int().positive();
const averageSchema = z.number().nonnegative().nullable();

export const modRatingsRequestSchema = z
  .strictObject({
    device_id: modDeviceIdSchema,
    account_id: modAccountIdSchema
  })
  .describe('Signed body of POST /mod/me/overview: the bound device and its account, nothing else');

export const modTankRatingsRequestSchema = z
  .strictObject({
    device_id: modDeviceIdSchema,
    account_id: modAccountIdSchema,
    tank_ids: z.array(modTankIdSchema).min(1).max(MOD_RATINGS.maxTanks)
  })
  .describe('Signed body of POST /mod/me/tanks: the own vehicles to rate (Lesta tank_id, the client intCD)');

export const modOverallRatingsSchema = z.object({
  battles: countSchema,
  win_rate: percentSchema.nullable(),
  avg_damage: averageSchema,
  wn8: ratingValueSchema,
  eff: ratingValueSchema,
  brone_index: ratingValueSchema,
  updated_at: isoDateTimeSchema
});

export const modSessionRatingsSchema = z.object({
  kind: sessionKindSchema,
  source: sessionSourceSchema,
  is_live: z.boolean(),
  started_at: isoDateTimeSchema,
  ended_at: isoDateTimeSchema.nullable(),
  battles: countSchema,
  win_rate: percentSchema.nullable(),
  avg_damage: averageSchema,
  wn8: ratingValueSchema,
  brone_index: ratingValueSchema
});

export const modOverviewSchema = z
  .object({
    account_id: modAccountIdSchema,
    nickname: z.string().nullable(),
    overall: modOverallRatingsSchema.nullable().describe('Random-battle ratings over the whole career; null until the account is tracked'),
    session: modSessionRatingsSchema.nullable().describe('The latest play session: the mod live session, else the latest API day')
  })
  .describe('The bound account own ratings, as the mod hangar panel shows them');

export const modTankRecordsSchema = z
  .object({
    max_damage: countSchema.nullable(),
    max_assist: countSchema.nullable(),
    max_frags: countSchema.nullable(),
    max_xp: countSchema.nullable()
  })
  .describe('Career records of the tank in random battles: the highest damage, assistance (radio + tracking), frags and base XP of one battle');

export const modTankExpectedSchema = z
  .object({
    damage: z.number().positive(),
    spot: z.number().nonnegative(),
    frag: z.number().nonnegative(),
    def: z.number().nonnegative(),
    win_rate: z.number().positive().max(100)
  })
  .describe('The WN8 expected values of the tank the site uses, per battle; win rate in percent');

export const modTankRatingSchema = z.object({
  tank_id: modTankIdSchema,
  battles: countSchema,
  win_rate: percentSchema.nullable(),
  avg_damage: averageSchema,
  wn8: ratingValueSchema,
  moe_percent: percentSchema.nullable(),
  marks_on_gun: z.number().int().min(0).max(3).nullable(),
  mastery: z.number().int().min(0).max(4),
  records: modTankRecordsSchema.nullable(),
  expected: modTankExpectedSchema.nullable()
});

export const modTankRatingsSchema = z
  .object({
    account_id: modAccountIdSchema,
    tanks: z.array(modTankRatingSchema).describe('One row per requested tank the account has data for, in request order')
  })
  .describe('Per-tank own ratings of the bound account');

export const modGoalsRequestSchema = z
  .strictObject({
    device_id: modDeviceIdSchema,
    account_id: modAccountIdSchema
  })
  .describe('Signed body of POST /mod/me/goals: the bound device and its account, nothing else');

export const modGoalSchema = z.object({
  id: goalSchema.shape.id,
  metric: goalSchema.shape.metric,
  tank_id: goalSchema.shape.tankId,
  target: goalSchema.shape.target,
  baseline: goalSchema.shape.baseline,
  current: goalSchema.shape.current,
  battles: countSchema.describe('Random battles counted in the goal window so far'),
  status: goalSchema.shape.status,
  starts_at: goalSchema.shape.startsAt,
  ends_at: goalSchema.shape.endsAt,
  achieved_at: goalSchema.shape.achievedAt
});

export const modGoalsSchema = z
  .object({
    account_id: modAccountIdSchema,
    goals: z.array(modGoalSchema).max(MOD_HANGAR.maxGoals).describe('Active goals and those ended in the last 24 hours, newest first')
  })
  .describe('The goals the bound account set on the site, for the mod session goals');

export const modReplayStatusRequestSchema = z
  .strictObject({
    device_id: modDeviceIdSchema,
    account_id: modAccountIdSchema,
    replay_ids: z.array(uuidSchema).min(1).max(MOD_HANGAR.maxReplayIds)
  })
  .describe('Signed body of POST /mod/me/replays: the ids POST /replays/mod answered');

export const modReplayHighlightsSchema = z
  .object({
    accuracy: percentSchema.nullable(),
    damage: countSchema.nullable(),
    penetrations: countSchema.nullable()
  })
  .describe('A short summary of the recorder battle for the hangar notice');

export const modReplayStatusSchema = z.object({
  id: uuidSchema,
  status: replayStatusSchema,
  highlights: modReplayHighlightsSchema.nullable()
});

export const modReplayStatusesSchema = z
  .object({
    account_id: modAccountIdSchema,
    replays: z.array(modReplayStatusSchema).describe('One row per requested replay the account owns, in request order')
  })
  .describe('Analysis state of the replays the mod uploaded');

const modShareChannelSchema = z.enum(MOD_HANGAR.shareChannels);

const modShareChannelsSchema = z
  .array(modShareChannelSchema)
  .min(1)
  .max(MOD_HANGAR.shareChannels.length)
  .refine((channels) => new Set(channels).size === channels.length, { message: 'Channels must be unique' });

export const modSessionSharePreferenceSchema = z
  .strictObject({
    device_id: modDeviceIdSchema,
    account_id: modAccountIdSchema,
    enabled: z.boolean(),
    channels: modShareChannelsSchema
  })
  .describe('Signed body of POST /mod/me/session-share: the opt-in session report and its channels');

export const modSessionSharePreferenceAnswerSchema = z
  .object({
    account_id: modAccountIdSchema,
    enabled: z.boolean(),
    channels: modShareChannelsSchema
  })
  .describe('The stored session report preference');

export const modSessionShareSendSchema = z
  .strictObject({
    device_id: modDeviceIdSchema,
    account_id: modAccountIdSchema,
    session_id: z.string().regex(MOD_HANGAR.shareSessionIdPattern),
    channels: modShareChannelsSchema
  })
  .describe('Signed body of POST /mod/me/session-share/send: post the card of that mod session now');

export const modSessionShareSentSchema = z
  .object({
    account_id: modAccountIdSchema,
    queued: modShareChannelsSchema
  })
  .describe('The channels the session card was queued to');

const modBadgeAccountIdsSchema = z
  .array(modAccountIdSchema)
  .max(MOD_BADGES.maxAccountIds)
  .refine((ids) => new Set(ids).size === ids.length, { message: 'Account ids must be unique' });

export const modBadgesRequestSchema = z
  .strictObject({
    device_id: modDeviceIdSchema,
    account_id: modAccountIdSchema,
    account_ids: modBadgeAccountIdsSchema.min(1)
  })
  .describe('Signed body of POST /mod/badges: the account ids of the players in the arena, nothing else');

export const modBadgesSchema = z
  .object({
    account_ids: modBadgeAccountIdsSchema
  })
  .describe('The asked accounts that use the bound mod and chose to show its badge');

export const modBadgePresenceRequestSchema = z
  .strictObject({
    account_id: modAccountIdSchema,
    visible: z.boolean(),
    account_ids: modBadgeAccountIdsSchema
  })
  .describe('Unsigned body of POST /mod/badges/presence: the own account, its badge switch and the other players of the battle');

export const modBadgePreferenceSchema = z
  .strictObject({
    device_id: modDeviceIdSchema,
    account_id: modAccountIdSchema,
    visible: z.boolean()
  })
  .describe('Signed body of POST /mod/badges/preference: whether other players see the badge of this device account');

export const modBadgePreferenceAnswerSchema = z
  .object({
    account_id: modAccountIdSchema,
    visible: z.boolean()
  })
  .describe('The stored badge preference of the device');
