import { modBattleLoadoutSchema } from '@otmetki/schemas';
import { z } from 'zod';

import { BIND_CODE, MOD_ACHIEVEMENTS, MOD_BATTLE_LIMITS, MOD_INGEST, MOD_PLATOON, MOD_SHOTS } from '../../config';

const id = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[\w:-]+$/);

const accountId = z.number().int().min(1);
const tankId = z.number().int().min(1);
const unixTime = z.number().int().min(0);
const eventTime = unixTime.refine((seconds) => seconds <= Date.now() / 1000 + MOD_INGEST.maxFutureSeconds, {
  message: 'The event is dated in the future'
});

const count = z.number().int().min(0);
const capped = (field: keyof typeof MOD_BATTLE_LIMITS.stats) => count.max(MOD_BATTLE_LIMITS.stats[field]);
const credits = z.number().int().min(-MOD_BATTLE_LIMITS.credits).max(MOD_BATTLE_LIMITS.credits);
const movingAvgDamage = count.max(MOD_BATTLE_LIMITS.stats.damage_dealt);
const damageRating = z.number().int().min(0).max(10_000);
const marksOnGun = z.number().int().min(0).max(3);

export const bindCodePattern = new RegExp(`^[${BIND_CODE.alphabet}]{${BIND_CODE.length}}$`);

export const bindRequestSchema = z.strictObject({
  code: z.string().regex(bindCodePattern),
  account_id: accountId.optional(),
  mod_version: z.string().max(32),
  client_version: z.string().max(64),
  realm: z.literal('RU')
});

export const bindResponseSchema = z.object({
  device_id: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[\w-]+$/),
  secret: z.string().min(32).max(128),
  account_id: accountId,
  nickname: z.string().optional(),
  revoked_device_ids: z.array(z.string().max(64)).optional()
});

const moeValuesSchema = z.strictObject({
  marks_on_gun: marksOnGun,
  damage_rating: damageRating,
  moving_avg_damage: movingAvgDamage
});

const modShotSchema = z.strictObject({
  damage: z.number().int().min(0).max(MOD_SHOTS.maxDamage),
  nominal: z.number().int().min(1).max(MOD_SHOTS.maxDamage).nullable(),
  shell: z.enum(MOD_SHOTS.shells),
  outcome: z.enum(MOD_SHOTS.outcomes),
  distance_m: z.number().int().min(0).max(MOD_SHOTS.maxDistanceM).nullable(),
  fatal: z.boolean()
});

const platoonSchema = z.strictObject({
  size: z.number().int().min(MOD_PLATOON.minSize).max(MOD_PLATOON.maxSize)
});

export const battleResultEventSchema = z.strictObject({
  type: z.literal('battle_result'),
  event_id: z.string().regex(/^battle:\d+$/),
  occurred_at: eventTime,
  arena_unique_id: z.string().regex(/^\d+$/),
  arena_type_id: count,
  map_name: z.string().max(64).nullable(),
  bonus_type: count,
  gui_type: count,
  arena_created_at: eventTime,
  duration_s: count.max(MOD_BATTLE_LIMITS.durationSeconds),
  finish_reason: count,
  winner_team: z.number().int().min(0).max(2),
  team: z.number().int().min(0).max(2),
  result: z.enum(['win', 'loss', 'draw']),
  vehicle: z.strictObject({
    tank_id: tankId,
    name: z.string().max(128).nullable(),
    tier: z.number().int().min(1).max(11).nullable()
  }),
  stats: z.strictObject({
    damage_dealt: capped('damage_dealt'),
    damage_assisted_radio: capped('damage_assisted_radio'),
    damage_assisted_track: capped('damage_assisted_track'),
    damage_assisted_stun: capped('damage_assisted_stun'),
    damage_blocked: capped('damage_blocked'),
    spotted: capped('spotted'),
    frags: capped('frags'),
    damaged: capped('damaged'),
    shots: capped('shots'),
    direct_hits: capped('direct_hits'),
    direct_enemy_hits: capped('direct_enemy_hits'),
    piercings: capped('piercings'),
    piercing_enemy_hits: capped('piercing_enemy_hits'),
    xp: capped('xp'),
    original_xp: capped('original_xp'),
    credits,
    original_credits: credits,
    subtotal_credits: credits,
    factual_credits: credits,
    life_time_s: capped('life_time_s'),
    is_alive: z.boolean(),
    death_reason: z.number().int().min(-1),
    is_premium: z.boolean(),
    free_xp: capped('free_xp').optional(),
    repair_cost: capped('repair_cost').optional(),
    ammo_cost: capped('ammo_cost').optional(),
    consumables_cost: capped('consumables_cost').optional()
  }),
  moe: moeValuesSchema.nullable(),
  queue_time_s: z.number().min(0).nullable(),
  session_id: z.string().max(64).nullable(),
  loadout: modBattleLoadoutSchema.nullable().optional(),
  platoon: platoonSchema.nullable().optional(),
  shots: z.array(modShotSchema).max(MOD_SHOTS.maxPerBattle).nullable().optional(),
  achievements: z.array(z.string().min(1).max(MOD_ACHIEVEMENTS.maxNameLength)).max(MOD_ACHIEVEMENTS.maxPerBattle).nullable().optional()
});

const moeSnapshotEventSchema = z.strictObject({
  type: z.literal('moe_snapshot'),
  event_id: id,
  occurred_at: eventTime,
  tank_id: tankId,
  damage_rating: damageRating,
  moving_avg_damage: movingAvgDamage,
  marks_on_gun: marksOnGun,
  battles: count.nullable()
});

const battleStartEventSchema = z.strictObject({
  type: z.literal('battle_start'),
  event_id: id,
  occurred_at: eventTime,
  tank_id: tankId.nullable()
});

const queueEventSchema = z.strictObject({
  type: z.literal('queue'),
  event_id: id,
  occurred_at: eventTime,
  queue_type: count,
  wait_s: z.number().min(0).max(1_800),
  outcome: z.enum(['arena', 'dequeued']),
  tank_id: tankId.nullable()
});

export const ingestEventSchema = z.discriminatedUnion('type', [
  battleResultEventSchema,
  moeSnapshotEventSchema,
  queueEventSchema,
  battleStartEventSchema
]);

export const ingestBatchSchema = z.strictObject({
  schema_version: z.literal(1),
  batch_id: id,
  device_id: z.string().min(1).max(64),
  account_id: accountId,
  realm: z.literal('RU'),
  mod_version: z.string().max(32),
  client_version: z.string().max(64),
  sent_at: unixTime,
  events: z.array(ingestEventSchema).min(1).max(50)
});

export const ingestResponseSchema = z.object({
  accepted: count,
  duplicates: count,
  session: z
    .object({
      session_id: z.string(),
      wn8: z.number().nullable(),
      battles: count
    })
    .optional()
});
