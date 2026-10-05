import { readDesignTokens } from '@otmetki/design-tokens';
import { describe, expect, it } from 'vitest';

import { HUD_PROTOCOL } from '@/shared/api/hud-protocol';

import { HUD_TONE_COLORS } from '../hud-tones.constants';

describe('HUD_TONE_COLORS', () => {
  it('has a colour for every tone of the protocol', () => {
    const tones = new Set(Object.keys(HUD_TONE_COLORS));

    expect(tones).toEqual(new Set(HUD_PROTOCOL.tones));
  });

  it.each(Object.entries(HUD_TONE_COLORS))('gives the %s tone the colour of its dark theme token', async (_tone, { token, hex }) => {
    const { themes, root } = await readDesignTokens();

    const tokenColor = themes.dark[token] ?? root[token];

    expect(tokenColor?.toLowerCase()).toBe(hex);
  });
});
