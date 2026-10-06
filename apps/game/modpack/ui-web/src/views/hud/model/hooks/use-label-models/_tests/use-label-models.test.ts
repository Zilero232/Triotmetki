// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { HudPanel } from '@/shared/api/hud-protocol';

import { parseHudState } from '@/shared/api/hud-protocol';
import hudStateSample from '@/shared/api/hud-protocol/_tests/fixtures/hud-state.sample.json?raw';

import type { LabelLayout } from '../../../../lib/label-layout';
import type { UseLabelModelsInput } from '../use-label-models.types';

import { useLabelModels } from '../use-label-models';

const samplePanel = (): HudPanel => {
  const panel = parseHudState(hudStateSample)?.panels[0];

  if (!panel) {
    throw new Error('the HUD fixture has no panels');
  }

  return panel;
};

const layout = (overrides: Partial<LabelLayout> = {}): LabelLayout => ({
  id: 'clock',
  rect: { left: 10, top: 20, width: 100, height: 30 },
  button: false,
  movable: false,
  pointer: false,
  scale: 1,
  panel: samplePanel(),
  style: { left: '10rem', top: '20rem', opacity: 1 },
  drawn: true,
  ...overrides
});

const input = (overrides: Partial<UseLabelModelsInput> = {}): UseLabelModelsInput => ({
  layouts: [layout()],
  lines: new Map(),
  widgets: new Map(),
  liveId: null,
  measureRef: () => vi.fn(),
  ...overrides
});

const firstLabel = (overrides: Partial<UseLabelModelsInput> = {}) => renderHook(() => useLabelModels(input(overrides))).result.current[0];

describe(useLabelModels, () => {
  it('keeps the style object while the style stays the same', () => {
    const hook = renderHook((props: UseLabelModelsInput) => useLabelModels(props), { initialProps: input() });
    const before = hook.result.current[0]?.style;

    hook.rerender(input({ layouts: [layout({ style: { left: '10rem', top: '20rem', opacity: 1 } })] }));

    expect(hook.result.current[0]?.style).toBe(before);
  });

  it('takes the new style once it changes', () => {
    const hook = renderHook((props: UseLabelModelsInput) => useLabelModels(props), { initialProps: input() });

    hook.rerender(input({ layouts: [layout({ style: { left: '40rem', top: '20rem', opacity: 1 } })] }));

    expect(hook.result.current[0]?.style.left).toBe('40rem');
  });

  it('makes a button pressable outside an edit', () => {
    expect(firstLabel({ layouts: [layout({ button: true })] })?.pressable).toBe(true);
  });

  it('keeps a button still while it can be moved', () => {
    expect(firstLabel({ layouts: [layout({ button: true, movable: true })] })?.pressable).toBe(false);
  });

  it('frames a movable label', () => {
    expect(firstLabel({ layouts: [layout({ movable: true })] })?.framed).toBe(true);
  });

  it('lets a label that only takes the pointer react to it', () => {
    expect(firstLabel({ layouts: [layout({ pointer: true })] })?.interactive).toBe(true);
  });

  it('marks the label being dragged', () => {
    expect(firstLabel({ liveId: 'clock' })?.dragging).toBe(true);
  });
});
