import { readFileSync } from 'node:fs';
import { isPlainObject } from 'remeda';
import { describe, expect, it } from 'vitest';

import { MOD_BATTLE_LIMITS } from '../../../config/battle-payload.constants';
import { MOD_INGEST } from '../../../config/ingest.constants';
import { ingestBatchSchema } from '../contract.schemas';

const example: { events: Record<string, unknown>[] } = JSON.parse(
  readFileSync(new URL('../../../../../../../../game/modpack/contract/examples/ingest.example.json', import.meta.url), 'utf8')
);

const nowSeconds = () => Math.floor(Date.now() / 1000);
const withEvent = (patch: (event: Record<string, unknown>) => Record<string, unknown>) => ({ ...example, events: example.events.map(patch) });

const withArenaId = (arenaUniqueId: string) =>
  withEvent((event) => (event.type === 'battle_result' ? { ...event, arena_unique_id: arenaUniqueId } : event));

describe('ingestBatchSchema', () => {
  it('accepts the contract example', () => {
    expect(ingestBatchSchema.safeParse(example).success).toBe(true);
  });

  it('refuses a battle dated in the future, which would stay inside every recent window forever', () => {
    const future = nowSeconds() + MOD_INGEST.maxFutureSeconds + 3_600;
    const batch = withEvent((event) => (event.type === 'battle_result' ? { ...event, arena_created_at: future } : event));

    expect(ingestBatchSchema.safeParse(batch).success).toBe(false);
  });

  it('accepts the largest signed 64-bit arena id', () => {
    const batch = withArenaId('9223372036854775807');

    expect(ingestBatchSchema.safeParse(batch).success).toBe(true);
  });

  it('refuses an arena id past 2^63-1, which would overflow the bigint column', () => {
    const batch = withArenaId('9223372036854775808');

    expect(ingestBatchSchema.safeParse(batch).success).toBe(false);
  });

  it('refuses an arena id longer than 19 digits before converting it', () => {
    const batch = withArenaId('1'.repeat(400));

    expect(ingestBatchSchema.safeParse(batch).success).toBe(false);
  });

  it('refuses a non-numeric arena id', () => {
    const batch = withArenaId('12a');

    expect(ingestBatchSchema.safeParse(batch).success).toBe(false);
  });

  it('refuses an event that claims to happen in the future', () => {
    const batch = withEvent((event) => ({ ...event, occurred_at: nowSeconds() + MOD_INGEST.maxFutureSeconds + 3_600 }));

    expect(ingestBatchSchema.safeParse(batch).success).toBe(false);
  });
});

describe('battle stat bounds', () => {
  const battle = example.events.find((event) => event.type === 'battle_result');
  const recorded = battle?.stats;
  const stats = isPlainObject(recorded) ? recorded : {};

  const withStats = (patch: Record<string, unknown>) =>
    withEvent((event) => (event.type === 'battle_result' ? { ...event, stats: { ...stats, ...patch } } : event));

  it.each(Object.entries(MOD_BATTLE_LIMITS.stats))('refuses %s above its per-battle cap', (field, cap) => {
    expect(ingestBatchSchema.safeParse(withStats({ [field]: cap + 1 })).success).toBe(false);
  });

  it.each(Object.entries(MOD_BATTLE_LIMITS.stats))('accepts %s exactly on its per-battle cap', (field, cap) => {
    expect(ingestBatchSchema.safeParse(withStats({ [field]: cap })).success).toBe(true);
  });

  it('refuses credits outside the per-battle range in either direction', () => {
    const { credits } = MOD_BATTLE_LIMITS;

    expect(ingestBatchSchema.safeParse(withStats({ credits: credits + 1 })).success).toBe(false);
    expect(ingestBatchSchema.safeParse(withStats({ factual_credits: -credits - 1 })).success).toBe(false);
  });

  it('refuses a battle that lasted longer than any game mode allows', () => {
    const batch = withEvent((event) => (event.type === 'battle_result' ? { ...event, duration_s: MOD_BATTLE_LIMITS.durationSeconds + 1 } : event));

    expect(ingestBatchSchema.safeParse(batch).success).toBe(false);
  });

  it.each(Object.entries(MOD_BATTLE_LIMITS.arena))('refuses %s above its bound', (field, cap) => {
    const batch = withEvent((event) => (event.type === 'battle_result' ? { ...event, [field]: cap + 1 } : event));

    expect(ingestBatchSchema.safeParse(batch).success).toBe(false);
  });

  it('refuses a queue time longer than any queue lasts, which would overflow the stored milliseconds', () => {
    const batch = withEvent((event) => (event.type === 'battle_result' ? { ...event, queue_time_s: MOD_BATTLE_LIMITS.queueSeconds + 1 } : event));

    expect(ingestBatchSchema.safeParse(batch).success).toBe(false);
  });

  it('refuses a moving average damage above the per-battle damage cap', () => {
    const batch = withEvent((event) =>
      event.type === 'moe_snapshot' ? { ...event, moving_avg_damage: MOD_BATTLE_LIMITS.stats.damage_dealt + 1 } : event
    );

    expect(ingestBatchSchema.safeParse(batch).success).toBe(false);
  });
});
