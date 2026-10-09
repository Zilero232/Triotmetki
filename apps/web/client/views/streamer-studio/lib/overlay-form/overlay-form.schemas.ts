import { createOverlaySchema, overlayConfigSchema } from '@otmetki/schemas';
import * as z from 'zod';

const { theme, layout, metrics, accentColor, fontScale, animate, showTank, resetAt, locale } = overlayConfigSchema.shape;

export const overlayFormSchema = z.object({
  name: createOverlaySchema.shape.name,
  kind: createOverlaySchema.shape.kind,
  config: z.object({
    theme: theme.unwrap(),
    layout: layout.unwrap(),
    metrics,
    accentColor,
    fontScale: fontScale.unwrap(),
    animate: animate.unwrap(),
    showTank: showTank.unwrap(),
    resetAt: resetAt.unwrap(),
    locale: locale.unwrap()
  })
});
