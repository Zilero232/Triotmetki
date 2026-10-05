import { describe, expect, it, vi } from 'vitest';

import type { HudState } from '@/shared/api/hud-protocol';

import { parseHudState } from '@/shared/api/hud-protocol';
import hudStateSample from '@/shared/api/hud-protocol/_tests/fixtures/hud-state.sample.json?raw';

import { clearedRecord, remember, sharePanels } from '../share-panels';

const RAW = hudStateSample;

const sampleState = (): HudState => {
  const state = parseHudState(RAW);

  if (!state) {
    throw new Error('the HUD fixture does not parse');
  }

  return state;
};

const twoPanelState = (): HudState => {
  const state = sampleState();

  return { ...state, panels: state.panels.flatMap((panel) => [panel, { ...panel, id: `${panel.id}.copy` }]) };
};

const withFirstPanelText = (text: string): HudState => {
  const state = twoPanelState();

  return { ...state, panels: state.panels.map((panel, index) => (index === 0 ? { ...panel, text } : panel)) };
};

describe(sharePanels, () => {
  it('keeps the previous state when nothing changed', () => {
    const previous = sampleState();

    expect(sharePanels({ previous, next: sampleState() })).toBe(previous);
  });

  it('takes the next state as it is when there is no previous one', () => {
    const next = sampleState();

    expect(sharePanels({ previous: null, next })).toBe(next);
  });

  it('gives a new state carrying the panel that changed', () => {
    const previous = sampleState();

    const next = sharePanels({ previous, next: withFirstPanelText('changed') });

    expect(next).not.toBe(previous);
    expect(next.panels[0]?.text).toBe('changed');
  });

  it('keeps the previous objects of the panels that did not change', () => {
    const previous = twoPanelState();

    const next = sharePanels({ previous, next: withFirstPanelText('changed') });

    const rebuilt = next.panels.filter((panel, index) => panel !== previous.panels[index]);

    expect(rebuilt.map((panel) => panel.text)).toEqual(['changed']);
  });
});

describe(remember, () => {
  it('builds a value once per panel object', () => {
    const cache = new WeakMap<object, number>();
    const [panel] = sampleState().panels;
    const build = vi.fn(() => 1);

    if (!panel) {
      throw new Error('the HUD fixture has no panels');
    }

    remember({ cache, panel, build });
    const second = remember({ cache, panel, build });

    expect(second).toBe(1);
    expect(build).toHaveBeenCalledOnce();
  });
});

describe(clearedRecord, () => {
  it('keeps an empty record as it is', () => {
    const empty = {};

    expect(clearedRecord(empty)).toBe(empty);
  });

  it('clears a record that holds something', () => {
    expect(clearedRecord({ a: 1 })).toEqual({});
  });
});
