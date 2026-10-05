import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseHudState } from '../hud-protocol';
import { HUD_PROTOCOL } from '../hud-protocol.constants';
import { hudMessageSchema } from '../hud-protocol.schemas';

const SAMPLE = readFileSync(path.resolve(import.meta.dirname, 'fixtures/hud-state.sample.json'), 'utf8');

const move = (alignX: string) => ({ type: 'moved', id: 'a', x: 1, y: 2, align_x: alignX, align_y: 'top' });

describe(parseHudState, () => {
  describe('the state core/hud/surface builds (fixture written by packages/core/tests/test_hud_backends)', () => {
    const state = parseHudState(SAMPLE);

    it('reads whether the cursor is shown', () => {
      expect(state?.cursor).toBe(true);
    });

    it('reads its panels', () => {
      expect(state?.panels.map(({ id }) => id)).toEqual(['otmetki.hud.damage_log']);
    });

    it('reads the anchor and drag flag of a panel', () => {
      expect(state?.panels[0]).toMatchObject({ align_x: 'left', align_y: 'bottom', drag: true });
    });
  });

  it('keeps the other panels when one panel does not match the schema', () => {
    const sample: { panels: Record<string, unknown>[] } = JSON.parse(SAMPLE);
    const [panel] = sample.panels;
    const mixed = JSON.stringify({ ...sample, panels: [{ ...panel, id: 'broken', text: null }, panel] });

    expect(parseHudState(mixed)?.panels.map(({ id }) => id)).toEqual(['otmetki.hud.damage_log']);
  });

  it('refuses text that is not JSON', () => {
    expect(parseHudState('not json')).toBeNull();
  });

  it('refuses another protocol version', () => {
    const otherVersion = JSON.stringify({ ...JSON.parse(SAMPLE), v: 99 });

    expect(parseHudState(otherVersion)).toBeNull();
  });
});

describe('hudMessageSchema', () => {
  it('has one schema per protocol command', () => {
    const types = hudMessageSchema._zod.def.options.map((option) => option._zod.def.shape.type._zod.def.values[0]);

    expect(types).toEqual([...HUD_PROTOCOL.commands]);
  });

  it('accepts a move with a known anchor', () => {
    expect(hudMessageSchema.safeParse(move('right')).success).toBe(true);
  });

  it('refuses a move with an unknown anchor', () => {
    expect(hudMessageSchema.safeParse(move('middle')).success).toBe(false);
  });
});
