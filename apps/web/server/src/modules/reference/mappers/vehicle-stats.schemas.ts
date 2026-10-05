import { z } from 'zod';

const storedShellSchema = z.object({
  shell: z.string(),
  kind: z.string().optional(),
  caliber: z.number().optional(),
  isPremium: z.boolean().optional(),
  explosionRadius: z.number().optional(),
  speed: z.number(),
  damage: z.number(),
  penetration100m: z.number(),
  penetration500m: z.number(),
  damagePerMinute: z.number()
});

export const storedProfileSchema = z.object({
  modules: z.record(z.string(), z.string().nullish()).default({}),
  maxHealth: z.number(),
  weight: z.number(),
  enginePower: z.number(),
  powerToWeight: z.number(),
  speedForward: z.number(),
  speedBackward: z.number(),
  hullTraverse: z.number(),
  turretTraverse: z.number(),
  viewRange: z.number(),
  radioRange: z.number(),
  reloadTime: z.number(),
  rateOfFire: z.number(),
  aimingTime: z.number(),
  dispersion: z.number(),
  dispersionMovement: z.number(),
  dispersionHullRotation: z.number(),
  dispersionTurretRotation: z.number(),
  elevation: z.number().optional(),
  depression: z.number().optional(),
  clip: z.object({ count: z.number(), interval: z.number(), reloadTime: z.number() }).optional(),
  shells: z.array(storedShellSchema).default([])
});
