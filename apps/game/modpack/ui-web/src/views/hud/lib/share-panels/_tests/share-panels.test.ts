import { describe, expect, it, vi } from 'vitest';

import type { HudPanel, HudState } from '@/shared/api/hud-protocol';

import { hudWidgetSchema, parseHudState } from '@/shared/api/hud-protocol';
import hudStateSample from '@/shared/api/hud-protocol/_tests/fixtures/hud-state.sample.json?raw';
import teamHpSample from '@/shared/api/hud-protocol/_tests/fixtures/widgets/team_hp.sample.json?raw';

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

const widgetState = (patch: Partial<HudPanel> = {}): HudState => {
  const state = sampleState();
  const widget = hudWidgetSchema.parse(JSON.parse(teamHpSample));

  return { ...state, panels: state.panels.map((panel) => ({ ...panel, kind: 'label', widget, ...patch })) };
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

  it('gives a new state when a panel changed', () => {
    const previous = sampleState();

    const next = sharePanels({ previous, next: withFirstPanelText('changed') });

    expect(next).not.toBe(previous);
  });

  it('carries the panel that changed', () => {
    const next = sharePanels({ previous: sampleState(), next: withFirstPanelText('changed') });

    expect(next.panels[0]?.text).toBe('changed');
  });

  it('keeps the previous objects of the panels that did not change', () => {
    const previous = twoPanelState();

    const next = sharePanels({ previous, next: withFirstPanelText('changed') });

    const rebuilt = next.panels.filter((panel, index) => panel !== previous.panels[index]);

    expect(rebuilt.map((panel) => panel.text)).toEqual(['changed']);
  });

  it('keeps the widget object of a panel that only moved', () => {
    const previous = widgetState();

    const next = sharePanels({ previous, next: widgetState({ x: 400, y: 300 }) });

    expect(next.panels[0]?.widget).toBe(previous.panels[0]?.widget);
  });

  it('keeps the widget object of a panel the cover hides', () => {
    const previous = widgetState();

    const next = sharePanels({ previous, next: widgetState({ cover: 'stats' }) });

    expect(next.panels[0]?.widget).toBe(previous.panels[0]?.widget);
  });

  it('gives a moved panel its new position', () => {
    const previous = widgetState();

    const next = sharePanels({ previous, next: widgetState({ x: 400 }) });

    expect(next.panels[0]?.x).toBe(400);
  });

  it('takes the new widget of a panel whose widget changed', () => {
    const previous = widgetState();
    const changed = { kind: 'team_hp', v: 1, data: {} };

    const next = sharePanels({ previous, next: widgetState({ widget: changed }) });

    expect(next.panels[0]?.widget).toBe(changed);
  });
});

describe(remember, () => {
  it('builds a value once per key', () => {
    const cache = new Map<string, number>();
    const build = vi.fn(() => 1);

    remember({ cache, key: 'panel', build });
    remember({ cache, key: 'panel', build });

    expect(build).toHaveBeenCalledOnce();
  });

  it('gives the remembered value back', () => {
    const cache = new Map([['panel', 1]]);

    expect(remember({ cache, key: 'panel', build: () => 2 })).toBe(1);
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
