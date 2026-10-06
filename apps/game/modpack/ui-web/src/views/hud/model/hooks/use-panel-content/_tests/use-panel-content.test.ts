// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { HudPanel, HudState } from '@/shared/api/hud-protocol';

import { hudWidgetSchema, parseHudState } from '@/shared/api/hud-protocol';
import hudStateSample from '@/shared/api/hud-protocol/_tests/fixtures/hud-state.sample.json?raw';
import teamHpSample from '@/shared/api/hud-protocol/_tests/fixtures/widgets/team_hp.sample.json?raw';

import { usePanelContent } from '../use-panel-content';

const PANEL_ID = 'otmetki.hud.damage_log';

const stateWith = (patch: Partial<HudPanel>): HudState => {
  const state = parseHudState(hudStateSample);

  if (!state) {
    throw new Error('the HUD fixture does not parse');
  }

  return { ...state, panels: state.panels.map((panel) => ({ ...panel, ...patch })) };
};

const widgetPanel = (patch: Partial<HudPanel> = {}): HudState => stateWith({ widget: hudWidgetSchema.parse(JSON.parse(teamHpSample)), ...patch });

const rerendered = ({ first, second }: { first: HudState; second: HudState }) => {
  const hook = renderHook(({ state }) => usePanelContent(state), { initialProps: { state: first } });
  const before = hook.result.current;

  hook.rerender({ state: second });

  return { before, after: hook.result.current };
};

describe(usePanelContent, () => {
  it('keeps the resolved widget of a panel whose widget object is the same', () => {
    const first = widgetPanel();
    const second = { ...first, panels: first.panels.map((panel) => ({ ...panel, x: panel.x + 50 })) };

    const { before, after } = rerendered({ first, second });

    expect(after.widgets.get(PANEL_ID)).toBe(before.widgets.get(PANEL_ID));
  });

  it('keeps the parsed lines of a panel whose text is the same', () => {
    const first = stateWith({ text: 'урон <b>1 200</b>' });

    const { before, after } = rerendered({ first, second: stateWith({ text: 'урон <b>1 200</b>', y: 10, cover: 'stats' }) });

    expect(after.lines.get(PANEL_ID)).toBe(before.lines.get(PANEL_ID));
  });

  it('parses the text again when it changes', () => {
    const first = stateWith({ text: 'урон' });

    const { before, after } = rerendered({ first, second: stateWith({ text: 'опыт' }) });

    expect(after.lines.get(PANEL_ID)).not.toBe(before.lines.get(PANEL_ID));
  });
});
