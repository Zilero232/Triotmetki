import * as z from 'zod/mini';

import { hudIconSchema, hudToneSchema } from '@/shared/api/hud-protocol';

import { CARD } from '../../config';

const text = z.nullable(z.string());

export const cardRowSchema = z.object({
  icon: hudIconSchema,
  status: z.nullable(z.enum(CARD.statuses)),
  label: text,
  text,
  text_tone: hudToneSchema,
  value: text,
  tone: hudToneSchema,
  color: text,
  note: text,
  detail: text,
  progress: z.nullable(z.number()),
  progress_tone: hudToneSchema
});

export const cardChipSchema = z.object({ icon: hudIconSchema, value: z.string(), tone: hudToneSchema, label: text, color: text });

export const cardSchema = z.object({
  title: text,
  icon: hudIconSchema,
  subtitle: text,
  value: text,
  value_tone: hudToneSchema,
  chips: z.array(cardChipSchema),
  strip: z.array(hudToneSchema),
  rows: z.array(cardRowSchema),
  footer: text,
  width: z.nullable(z.number())
});
