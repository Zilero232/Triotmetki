import { describe, expect, it } from 'vitest';

import type { TankEconomyAggregate } from '../../../../../generated';

import { toTankEconomy } from '../tank-economy.mappers';

const aggregate = (account: TankEconomyAggregate['account'], computedAt: Date): TankEconomyAggregate => ({
  tankId: 1,
  account,
  battles: 40,
  players: 8,
  costBattles: 20,
  credits: 50_000,
  creditsBase: 33_000,
  repair: 4_000,
  ammo: 2_000,
  consumables: 3_000,
  net: 41_000,
  xp: 1_200,
  freeXp: 60,
  windowDays: 30,
  computedAt
});

describe('toTankEconomy', () => {
  it('splits the aggregate rows by account type and leaves a missing one null', () => {
    const economy = toTankEconomy({ tankId: 1, rows: [aggregate('all', new Date('2026-09-25')), aggregate('premium', new Date('2026-09-26'))] });

    expect(economy.all?.battles).toBe(40);
    expect(economy.premium).not.toBeNull();
    expect(economy.standard).toBeNull();
    expect(economy.computedAt).toBe(new Date('2026-09-26').toISOString());
  });

  it('is empty but well-formed for a tank with no aggregate', () => {
    expect(toTankEconomy({ tankId: 1, rows: [] })).toMatchObject({ all: null, premium: null, standard: null, computedAt: null });
  });
});
