import { describe, expect, it } from 'vitest';

import type { UiComponent, UiState } from '@/shared/api/protocol';

import { panelPreview } from '../card-layout';

const component = (overrides: Partial<UiComponent> = {}): UiComponent => ({
  id: 'clock',
  group: 'battle',
  section: 'battle',
  context: 'battle',
  title: 'Clock',
  hint: null,
  switch: null,
  fields: [],
  panel: false,
  actions: [],
  page: null,
  ...overrides
});

type Panel = UiState['hud']['panels'][number];

const hudPanel = (overrides: Partial<Panel> = {}): Panel => ({
  id: 'clock',
  title: 'Clock',
  enabled: true,
  x: 0,
  y: 0,
  align_x: 'left',
  align_y: 'top',
  preview: '12:34',
  width: 80,
  height: 20,
  ...overrides
});

describe(panelPreview, () => {
  it('reads the preview of the panel the card belongs to', () => {
    const panels = [hudPanel({ id: 'other', preview: 'x' }), hudPanel()];

    const preview = panelPreview({ component: component({ panel: true }), panels });

    expect(preview?.preview).toBe('12:34');
  });

  it('has no preview for a card that is not a panel', () => {
    const preview = panelPreview({ component: component(), panels: [hudPanel()] });

    expect(preview).toBeNull();
  });

  it('has no preview for a panel the HUD does not list', () => {
    const preview = panelPreview({ component: component({ panel: true }), panels: [] });

    expect(preview).toBeNull();
  });
});
