import { describe, expect, it } from 'vitest';

import type { UiComponent, UiField, UiState } from '@/shared/api/protocol';

import { cardLayout, panelPreview } from '../card-layout';

const field: UiField = { key: 'enabled', label: 'Enabled', hint: null, type: 'bool', value: true, default: true };

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

describe(cardLayout, () => {
  it('shows the empty note for a card with nothing to set', () => {
    const layout = cardLayout({ component: component(), fields: undefined, isExpanded: true, forceOpen: false });

    expect(layout).toEqual({ fields: [], advanced: [], expandable: false, open: false, showEmpty: true, chevron: 'chevron-down' });
  });

  it('opens an expanded card with fields', () => {
    const layout = cardLayout({ component: component({ fields: [field] }), fields: undefined, isExpanded: true, forceOpen: false });

    expect(layout).toEqual({ fields: [field], advanced: [], expandable: true, open: true, showEmpty: false, chevron: 'chevron-up' });
  });

  it('keeps a collapsed card closed', () => {
    const layout = cardLayout({ component: component({ fields: [field] }), fields: undefined, isExpanded: false, forceOpen: false });

    expect(layout.open).toBe(false);
  });

  it('opens a collapsed card that is forced open', () => {
    const layout = cardLayout({ component: component({ fields: [field] }), fields: undefined, isExpanded: false, forceOpen: true });

    expect(layout.open).toBe(true);
  });

  it('points into the editor of a card that has one', () => {
    const editor = { groups: [], icons: {}, swatches: {} };

    const layout = cardLayout({ component: component({ fields: [field], editor }), fields: undefined, isExpanded: true, forceOpen: false });

    expect(layout.chevron).toBe('chevron-right');
  });

  it('shows only the fields it is given instead of all of the component', () => {
    const layout = cardLayout({ component: component({ fields: [field] }), fields: [], isExpanded: true, forceOpen: false });

    expect(layout.fields).toEqual([]);
  });

  it('folds the advanced fields away from the everyday ones', () => {
    const folder: UiField = { ...field, key: 'folder', advanced: true };

    const layout = cardLayout({ component: component({ fields: [field, folder] }), fields: undefined, isExpanded: true, forceOpen: false });

    expect(layout.fields).toEqual([field]);
    expect(layout.advanced).toEqual([folder]);
  });

  it('lets a HUD panel card expand for its preview while it still shows the empty note', () => {
    const layout = cardLayout({ component: component({ panel: true }), fields: undefined, isExpanded: true, forceOpen: false });

    expect(layout).toEqual({ fields: [], advanced: [], expandable: true, open: true, showEmpty: true, chevron: 'chevron-up' });
  });
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
