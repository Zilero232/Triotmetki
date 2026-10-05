import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseFeed, parseState } from '../protocol';
import { PROTOCOL } from '../protocol.constants';
import { messageSchema } from '../protocol.schemas';

const SAMPLE = readFileSync(path.resolve(import.meta.dirname, 'fixtures/state.sample.json'), 'utf8');

const feed = (values: Record<string, unknown>): string => JSON.stringify({ v: 2, feed: 'replay_manager', rev: 1, base: null, page: null, ...values });

const hudMove = (alignX: string) => ({ type: 'hud_move', panel: 'damage_log', x: 1, y: 2, align_x: alignX });

describe('parseState', () => {
  describe('the state the Python bridge builds (fixture written by packages/ui/tests)', () => {
    const state = parseState(SAMPLE);

    it('reads every component in order', () => {
      expect(state?.components.map(({ id }) => id)).toEqual([
        'companion',
        'marks_panel',
        'session_stats',
        'minimap',
        'replay_manager',
        'damage_log',
        'hud_layouts'
      ]);
    });

    it('reads the HUD panels with their previews', () => {
      expect(state?.hud.panels[0]).toMatchObject({ id: 'damage_log', preview: '1 200' });
    });

    it('reads the active profile', () => {
      expect(state?.profiles.active).toBe('p1');
    });
  });

  it('keeps the other cards when one component does not match the schema', () => {
    const sample: { components: Record<string, unknown>[] } = JSON.parse(SAMPLE);
    const [first, ...rest] = sample.components;
    const broken = JSON.stringify({ ...sample, components: [{ ...first, title: null }, ...rest] });

    expect(parseState(broken)?.components.map(({ id }) => id)).toEqual([
      'marks_panel',
      'session_stats',
      'minimap',
      'replay_manager',
      'damage_log',
      'hud_layouts'
    ]);
  });

  it.each([
    ['text that is not JSON', 'not json'],
    ['a message with only the version', '{"v": 2}'],
    ['another protocol version', JSON.stringify({ ...JSON.parse(SAMPLE), v: 99 })]
  ])('refuses %s', (_case, text) => {
    expect(parseState(text)).toBeNull();
  });
});

describe('parseFeed', () => {
  it('reads the items of a snapshot', () => {
    const snapshot = parseFeed(feed({ page: { kind: 'replays' }, items: [{ id: 'a', x: 1 }] }));

    expect(snapshot?.items).toEqual([{ id: 'a', x: 1 }]);
  });

  it('reads the removed ids of a delta', () => {
    const delta = parseFeed(feed({ rev: 2, base: 1, set: [], del: ['a'] }));

    expect(delta?.del).toEqual(['a']);
  });

  it.each([
    ['another version', JSON.stringify({ v: 1, feed: 'x', rev: 1, base: null, page: null })],
    ['an item without an id', feed({ items: [{ title: 'no id' }] })],
    ['text that is not JSON', '{']
  ])('refuses %s', (_case, text) => {
    expect(parseFeed(text)).toBeNull();
  });
});

describe('messageSchema', () => {
  it('has one schema per protocol command', () => {
    const types = messageSchema._zod.def.options.map((option) => option._zod.def.shape.type._zod.def.values[0]);

    expect(types).toEqual([...PROTOCOL.commands]);
  });

  it('accepts a HUD move with a known alignment', () => {
    expect(messageSchema.safeParse(hudMove('right')).success).toBe(true);
  });

  it('refuses a HUD move with an unknown alignment', () => {
    expect(messageSchema.safeParse(hudMove('middle')).success).toBe(false);
  });
});
