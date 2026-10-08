import * as z from 'zod/mini';

import { hudToneSchema } from '@/shared/api/hud-protocol';

import { ARMOR_MAP } from '../../config';

export const armorModeSchema = z.enum(ARMOR_MAP.modes);

export const armorMapSchema = z.object({
  cols: z.number(),
  rows: z.number(),
  left: z.number(),
  top: z.number(),
  width: z.number(),
  height: z.number(),
  cells: z.string(),
  mode: armorModeSchema,
  opacity: z.number()
});

const scaleEntrySchema = z.object({ tone: z.number(), label: z.string() });

const kindEntrySchema = z.object({ tone: z.number(), pattern: z.number(), label: z.string() });

const choiceSchema = z.object({ label: z.string(), active: z.boolean() });

const modeChoiceSchema = z.object({ key: z.string(), label: z.string(), active: z.boolean() });

const readoutRowSchema = z.object({ label: z.string(), value: z.string(), tone: hudToneSchema });

export const armorReadoutSchema = z.object({
  title: z.string(),
  rows: z.array(readoutRowSchema),
  verdict: z.nullable(z.string()),
  verdict_tone: hudToneSchema
});

export const armorLegendSchema = z.object({
  title: z.string(),
  tank: z.string(),
  mode: armorModeSchema,
  modes: z.array(modeChoiceSchema),
  attacker: z.nullable(z.string()),
  shells: z.array(choiceSchema),
  scale: z.array(scaleEntrySchema),
  unit: z.nullable(z.string()),
  kinds: z.array(kindEntrySchema),
  status: z.string(),
  status_tone: hudToneSchema,
  readout: z.nullable(armorReadoutSchema),
  hint: z.string()
});
