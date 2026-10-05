import type * as z from 'zod/mini';

import type {
  hudAttachSchema,
  hudDockSchema,
  hudMessageSchema,
  hudPanelSchema,
  hudStateSchema,
  hudToneSchema,
  hudWidgetSchema
} from './hud-protocol.schemas';

export type HudState = z.infer<typeof hudStateSchema>;
export type HudPanel = z.infer<typeof hudPanelSchema>;
export type HudWidget = z.infer<typeof hudWidgetSchema>;
export type HudDock = z.infer<typeof hudDockSchema>;
export type HudAttach = z.infer<typeof hudAttachSchema>;
export type HudToneValue = z.infer<typeof hudToneSchema>;
export type HudMessage = z.infer<typeof hudMessageSchema>;
export type HudMessageOf<Type extends HudMessage['type']> = Extract<HudMessage, { type: Type }>;
