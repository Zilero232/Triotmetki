import type { ShellStats, VehicleStats } from '@otmetki/schemas';

import { isNonNullish, pickBy } from 'remeda';

import type { StoredProfile, StoredShell } from './vehicle-stats.types';

import { storedProfileSchema } from './vehicle-stats.schemas';

const nonNegative = (value: number): number => (Number.isFinite(value) ? Math.max(0, value) : 0);

const toShellStats = (shell: StoredShell): ShellStats => ({
  shell: shell.shell,
  kind: shell.kind ?? null,
  caliber: shell.caliber ?? null,
  isPremium: shell.isPremium ?? false,
  damage: Math.round(nonNegative(shell.damage)),
  penetration100m: nonNegative(shell.penetration100m),
  penetration500m: nonNegative(shell.penetration500m),
  speed: nonNegative(shell.speed),
  explosionRadius: shell.explosionRadius ?? null,
  damagePerMinute: nonNegative(shell.damagePerMinute)
});

export const toVehicleStats = (profile: StoredProfile): VehicleStats => {
  const shells = (profile.shells ?? []).map(toShellStats);

  return {
    modules: pickBy(profile.modules ?? {}, isNonNullish),
    maxHealth: Math.round(nonNegative(profile.maxHealth)),
    weight: nonNegative(profile.weight),
    enginePower: nonNegative(profile.enginePower),
    powerToWeight: nonNegative(profile.powerToWeight),
    speedForward: nonNegative(profile.speedForward),
    speedBackward: nonNegative(profile.speedBackward),
    hullTraverse: nonNegative(profile.hullTraverse),
    turretTraverse: nonNegative(profile.turretTraverse),
    viewRange: nonNegative(profile.viewRange),
    radioRange: nonNegative(profile.radioRange),
    reloadTime: nonNegative(profile.reloadTime),
    rateOfFire: nonNegative(profile.rateOfFire),
    aimingTime: nonNegative(profile.aimingTime),
    dispersion: nonNegative(profile.dispersion),
    dispersionMovement: nonNegative(profile.dispersionMovement),
    dispersionHullRotation: nonNegative(profile.dispersionHullRotation),
    dispersionTurretRotation: nonNegative(profile.dispersionTurretRotation),
    elevation: profile.elevation ?? null,
    depression: profile.depression ?? null,
    clip: profile.clip
      ? {
          count: Math.round(nonNegative(profile.clip.count)),
          interval: nonNegative(profile.clip.interval),
          reloadTime: nonNegative(profile.clip.reloadTime)
        }
      : null,
    shell: shells[0] ?? null,
    shells
  };
};

export const readVehicleStats = (value: unknown): VehicleStats | null => {
  const parsed = storedProfileSchema.safeParse(value);

  return parsed.success ? toVehicleStats(parsed.data) : null;
};
