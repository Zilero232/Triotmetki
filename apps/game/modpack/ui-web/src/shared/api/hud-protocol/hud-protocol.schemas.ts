import * as z from 'zod/mini';

import { PROTOCOL, widgetSchema } from '../protocol';
import { HUD_PROTOCOL } from './hud-protocol.constants';

const alignX = z.enum(PROTOCOL.alignX);
const alignY = z.enum(PROTOCOL.alignY);

export const hudWidgetSchema = widgetSchema;

export const hudToneSchema = z.enum(HUD_PROTOCOL.tones);

export const hudIconSchema = z.nullable(z.string());

export const hudDockSchema = z.object({
  group: z.string(),
  order: z.number(),
  reserve: z.optional(z.number()),
  ceiling: z.optional(z.number())
});

export const hudPanelSchema = z.object({
  id: z.string(),
  text: z.string(),
  x: z.number(),
  y: z.number(),
  align_x: alignX,
  align_y: alignY,
  alpha: z.number(),
  drag: z.boolean(),
  border: z.boolean(),
  visible: z.boolean(),
  scale: z.number(),
  kind: z.enum(HUD_PROTOCOL.kinds),
  widget: z.nullable(hudWidgetSchema),
  dock: z.optional(z.nullable(hudDockSchema)),
  hint: z.optional(z.string()),
  cover: z.optional(z.enum(HUD_PROTOCOL.covers))
});

export const hudStateSchema = z.object({
  v: z.literal(HUD_PROTOCOL.version),
  cursor: z.boolean(),
  edit: z.boolean(),
  hover: z.boolean(),
  panels: z.array(hudPanelSchema)
});

export const hudMessageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('ready') }),
  z.object({ type: z.literal('moved'), id: z.string(), x: z.number(), y: z.number(), align_x: alignX, align_y: alignY }),
  z.object({ type: z.literal('resized'), id: z.string(), scale: z.number() }),
  z.object({ type: z.literal('pressed'), id: z.string() }),
  z.object({ type: z.literal('mouse'), event: z.enum(HUD_PROTOCOL.mouseEvents) })
]);
