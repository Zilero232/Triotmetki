import { HUD_GLYPHS } from '@/shared/config';

import type { GlyphPaths } from './glyph-paths.types';

export const glyphPaths = (name: string): GlyphPaths => {
  const shapes: Partial<Record<string, readonly string[]>> = HUD_GLYPHS.shapes;
  const details: Partial<Record<string, readonly string[]>> = HUD_GLYPHS.details;

  return { shapes: shapes[name] ?? HUD_GLYPHS.shapes.damage, details: details[name] ?? [] };
};
