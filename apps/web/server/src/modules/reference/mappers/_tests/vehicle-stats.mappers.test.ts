import { describe, expect, it } from 'vitest';

import type { StoredProfile } from '../vehicle-stats.types';

import { readVehicleStats, toVehicleStats } from '../vehicle-stats.mappers';

const shell = {
  shell: 'AP',
  speed: 900,
  damage: 390.6,
  penetration100m: 258,
  penetration500m: 250,
  damagePerMinute: 2_800
};

const profile = {
  modules: { gun: 'gun-1', turret: null },
  maxHealth: 1_899.6,
  weight: 60,
  enginePower: 1_200,
  powerToWeight: 20,
  speedForward: 50,
  speedBackward: 20,
  hullTraverse: 30,
  turretTraverse: 35,
  viewRange: 400,
  radioRange: 700,
  reloadTime: 8,
  rateOfFire: 7.5,
  aimingTime: 2,
  dispersion: 0.34,
  dispersionMovement: 0.1,
  dispersionHullRotation: 0.1,
  dispersionTurretRotation: 0.05,
  shells: [shell, { ...shell, shell: 'HEAT' }]
} satisfies StoredProfile;

describe('toVehicleStats', () => {
  it('drops modules without an installed item', () => {
    expect(toVehicleStats(profile).modules).toEqual({ gun: profile.modules.gun });
  });

  it('rounds health and damage to whole points', () => {
    const stats = toVehicleStats(profile);

    expect(stats.maxHealth).toBe(Math.round(profile.maxHealth));
    expect(stats.shell?.damage).toBe(Math.round(shell.damage));
  });

  it('clamps negative and non-finite values to zero', () => {
    const stats = toVehicleStats({ ...profile, weight: -5, viewRange: Number.NaN, shells: [{ ...shell, speed: Number.POSITIVE_INFINITY }] });

    expect(stats.weight).toBe(0);
    expect(stats.viewRange).toBe(0);
    expect(stats.shell?.speed).toBe(0);
  });

  it('uses the first shell as the default shell', () => {
    const stats = toVehicleStats(profile);

    expect(stats.shells).toHaveLength(profile.shells.length);
    expect(stats.shell?.shell).toBe(shell.shell);
  });

  it('reports no shell, clip or gun angles when the profile has none', () => {
    const stats = toVehicleStats({ ...profile, shells: [] });

    expect(stats.shell).toBeNull();
    expect(stats.clip).toBeNull();
    expect(stats.elevation).toBeNull();
    expect(stats.depression).toBeNull();
  });

  it('keeps a zero gun depression instead of treating it as missing', () => {
    expect(toVehicleStats({ ...profile, depression: 0 }).depression).toBe(0);
  });

  it('fills optional shell fields with explicit defaults', () => {
    expect(toVehicleStats(profile).shell).toMatchObject({ kind: null, caliber: null, isPremium: false, explosionRadius: null });
  });

  it('rounds the clip size and keeps its timings', () => {
    const clip = { count: 3.4, interval: 2.5, reloadTime: 20 };

    expect(toVehicleStats({ ...profile, clip }).clip).toEqual({ ...clip, count: Math.round(clip.count) });
  });
});

describe('readVehicleStats', () => {
  it('reads a stored profile', () => {
    expect(readVehicleStats(profile)).toEqual(toVehicleStats(profile));
  });

  it('defaults missing modules and shells to empty', () => {
    const { modules: _modules, shells: _shells, ...bare } = profile;
    const stats = readVehicleStats(bare);

    expect(stats?.modules).toEqual({});
    expect(stats?.shells).toEqual([]);
  });

  it('returns null for a malformed profile', () => {
    expect(readVehicleStats({ ...profile, maxHealth: 'many' })).toBeNull();
    expect(readVehicleStats(null)).toBeNull();
  });
});
