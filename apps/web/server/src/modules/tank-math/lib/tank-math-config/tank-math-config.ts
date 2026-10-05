import { calculateLoadout, resolveModules, toShellKind } from '@otmetki/gamedata';

import type { TankMathConfig } from '../../tank-math.types';
import type { TankMathConfigInput } from './tank-math-config.types';

import { TANK_MATH } from '../../config/tank-math.constants';

export const toTankMathConfig = ({ vehicle, preset }: TankMathConfigInput): TankMathConfig => {
  const { chassis, turret, gun, engine, radio } = resolveModules({ vehicle, modules: preset });
  const stats = calculateLoadout({ vehicle, modules: preset });
  const camoNet = vehicle.optDevsOverrides[TANK_MATH.camoNetDevice]?.[TANK_MATH.camoNetParam]?.[0] ?? 0;

  return {
    modules: { chassis: chassis.displayName, turret: turret.displayName, gun: gun.displayName, engine: engine.displayName, radio: radio.displayName },
    handling: {
      aimingTime: stats.aimingTime,
      dispersion: stats.dispersion,
      dispersionMovement: stats.dispersionMovement,
      dispersionHullRotation: stats.dispersionHullRotation,
      dispersionTurretRotation: stats.dispersionTurretRotation,
      dispersionAfterShot: stats.dispersionAfterShot,
      speedForward: stats.speedForward,
      hullTraverse: stats.hullTraverse,
      turretTraverse: stats.turretTraverse
    },
    shells: gun.shots.map((shot) => ({
      shell: shot.shell,
      kind: toShellKind(shot.kind),
      caliber: shot.caliber ?? null,
      isPremium: shot.isPremium ?? false,
      damage: shot.damage?.armor ?? 0,
      speed: shot.speed,
      gravity: shot.gravity,
      maxDistance: shot.maxDistance,
      penetration100m: shot.piercingPower.at100m,
      penetration500m: shot.piercingPower.at500m
    })),
    vision: { baseViewRange: turret.circularVisionRadius, viewRange: stats.viewRangeUncapped },
    camouflage: {
      still: vehicle.invisibility.still,
      moving: vehicle.invisibility.moving,
      camouflageBonus: vehicle.invisibility.camouflageBonus ?? 0,
      atShot: gun.invisibilityFactorAtShot ?? TANK_MATH.neutralAtShot,
      camoNet
    }
  };
};
