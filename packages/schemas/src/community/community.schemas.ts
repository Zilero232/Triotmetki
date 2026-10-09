import * as z from 'zod';

import { countSchema, isoDateTimeSchema, tankIdSchema, uuidSchema } from '../common/primitives/primitives.schemas';
import { LOADOUT } from './community.constants';

const slot = z.number().int().positive().nullable();

export const loadoutSchema = z.object({
  profileId: z.string().min(1).max(LOADOUT.nameLength).optional(),
  equipment: z.array(slot).max(LOADOUT.equipmentSlots),
  consumables: z.array(slot).max(LOADOUT.consumableSlots),
  directives: z.array(slot).max(LOADOUT.directiveSlots).default([]),
  ammo: z
    .array(z.object({ shellId: z.number().int().positive(), count: countSchema }))
    .max(LOADOUT.ammoSlots)
    .default([]),
  crewSkills: z
    .record(z.string().max(LOADOUT.nameLength), z.array(z.string().max(LOADOUT.nameLength)).max(LOADOUT.skillsPerMember))
    .refine((crew) => Object.keys(crew).length <= LOADOUT.crewRoles, { message: `At most ${LOADOUT.crewRoles} crew roles` }),
  fieldModifications: z.array(z.string().max(LOADOUT.nameLength)).max(LOADOUT.fieldModifications).default([])
});

export const authorSchema = z.object({ id: uuidSchema, name: z.string(), image: z.url().nullable() });

export const visibilitySchema = z.enum(['public', 'unlisted', 'private']);

export const buildSchema = z.object({
  id: uuidSchema,
  tankId: tankIdSchema,
  title: z.string(),
  description: z.string().nullable(),
  loadout: loadoutSchema,
  stats: z.record(z.string(), z.number().nullable()).nullable(),
  author: authorSchema,
  visibility: visibilitySchema,
  likesCount: countSchema,
  likedByMe: z.boolean(),
  gameVersion: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const createBuildSchema = z.object({
  tankId: tankIdSchema,
  title: z.string().trim().min(3).max(80),
  description: z.string().trim().max(4000).optional(),
  loadout: loadoutSchema,
  visibility: visibilitySchema.default('public')
});
