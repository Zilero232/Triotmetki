import { z } from 'zod';

const pickStats = {
  battles: z.number().int().nonnegative(),
  share: z.number().min(0).max(1),
  winRate: z.number().min(0).max(100).nullable(),
  avgDamage: z.number().nonnegative().nullable()
};

const idPick = z.object({ id: z.number().int().positive(), ...pickStats });
const tagPick = z.object({ tag: z.string(), ...pickStats });

export const storedBuildUsageSchema = z.object({
  equipment: z.array(z.object({ slot: z.number().int().nonnegative(), picks: z.array(idPick) })).default([]),
  consumables: z.array(idPick).default([]),
  directives: z.array(idPick).default([]),
  fieldModifications: z.array(tagPick).default([]),
  shells: z
    .array(
      z.object({
        shellId: z.number().int().positive(),
        share: z.number().min(0).max(1),
        ammoShare: z.number().min(0).max(1),
        avgCount: z.number().nonnegative()
      })
    )
    .default([]),
  crew: z
    .array(
      z.object({
        role: z.string(),
        members: z.number().int().nonnegative(),
        skills: z.array(z.object({ skill: z.string(), share: z.number().min(0).max(1), avgPosition: z.number().nonnegative() }))
      })
    )
    .default([])
});
