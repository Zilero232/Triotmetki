import { describe, expect, it } from 'vitest';

import type { EconomyRow, LearningRow } from '../tank-economy.types';

import { toEconomyRecord, toLearningRecord } from '../tank-economy.mappers';

const computedAt = new Date('2026-09-26T07:30:00Z');

const ECONOMY_ROW: EconomyRow = {
  tank_id: 1,
  account: 'premium',
  battles: 40,
  players: 7,
  cost_battles: 12,
  credits: 51_234.5,
  credits_base: 34_156.2,
  repair: 4_200,
  ammo: 1_800.4,
  consumables: 3_000,
  net: 42_000.6,
  xp: 1_150.5,
  free_xp: 57.4
};

const LEARNING_ROW: LearningRow = { tank_id: 1, bucket: 2, battles: 120, players: 9, wins: 64, damage: 250_000 };

describe('toEconomyRecord', () => {
  it('rounds medians to whole credits and experience', () => {
    const record = toEconomyRecord({ row: ECONOMY_ROW, windowDays: 30, computedAt });

    expect([record.credits, record.creditsBase, record.ammo, record.net, record.xp, record.freeXp]).toEqual([
      Math.round(ECONOMY_ROW.credits ?? 0),
      Math.round(ECONOMY_ROW.credits_base ?? 0),
      Math.round(ECONOMY_ROW.ammo ?? 0),
      Math.round(ECONOMY_ROW.net ?? 0),
      Math.round(ECONOMY_ROW.xp ?? 0),
      Math.round(ECONOMY_ROW.free_xp ?? 0)
    ]);
  });

  it('drops the cost medians when no battle reported its costs', () => {
    const record = toEconomyRecord({ row: { ...ECONOMY_ROW, cost_battles: 0 }, windowDays: 30, computedAt });

    expect([record.repair, record.ammo, record.consumables, record.net]).toEqual([null, null, null, null]);
    expect(record.credits).not.toBeNull();
  });

  it('keeps a missing median as null rather than zero', () => {
    const record = toEconomyRecord({ row: { ...ECONOMY_ROW, credits_base: null, free_xp: null }, windowDays: 30, computedAt });

    expect(record.creditsBase).toBeNull();
    expect(record.freeXp).toBeNull();
  });
});

describe('toLearningRecord', () => {
  it('never stores more wins than battles', () => {
    const record = toLearningRecord({ row: { ...LEARNING_ROW, wins: LEARNING_ROW.battles + 5 }, windowDays: 90, computedAt });

    expect(record.wins).toBe(LEARNING_ROW.battles);
  });

  it('stores damage as a bigint whatever the driver returned', () => {
    expect(toLearningRecord({ row: { ...LEARNING_ROW, damage: 1_000 }, windowDays: 90, computedAt }).damage).toBe(1_000n);
  });
});
