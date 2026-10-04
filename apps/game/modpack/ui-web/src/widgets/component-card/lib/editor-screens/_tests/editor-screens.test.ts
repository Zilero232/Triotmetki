import { describe, expect, it } from 'vitest';

import type { UiEditor } from '../../../../../shared/api/protocol';
import type { PreviewPanel } from '../../card-layout/card-layout.types';

import { editorSchematic, editorScreens } from '../editor-screens';

const WIDGET = { kind: 'card', v: 1, data: {} };

const editor = (overrides: Partial<UiEditor> = {}): UiEditor => ({ groups: [], icons: {}, swatches: {}, ...overrides });

const panel: PreviewPanel = {
  id: 'marks_panel',
  title: 'Marks',
  enabled: true,
  x: 0,
  y: 0,
  align_x: 'center',
  align_y: 'top',
  preview: '87%',
  text: null,
  widget: WIDGET,
  width: 200,
  height: 40
};

describe(editorScreens, () => {
  it('puts the panel preview first and the samples after it', () => {
    const screens = editorScreens({
      preview: panel,
      editor: editor({ samples: [{ id: 'card', label: 'Tank card', widget: WIDGET }] }),
      previewLabel: 'In game'
    });

    expect(screens.map(({ id, label }) => [id, label])).toEqual([
      ['panel', 'In game'],
      ['card', 'Tank card']
    ]);

    expect(screens[0]?.text).toBe('87%');
  });

  it('shows only the samples of a component that is no HUD panel', () => {
    expect(editorScreens({ preview: null, editor: editor(), previewLabel: 'In game' })).toEqual([]);
  });
});

describe(editorSchematic, () => {
  it('draws a schematic only when the editor names one', () => {
    expect(editorSchematic({ editor: editor(), fields: [] })).toBeNull();
    expect(editorSchematic({ editor: editor({ schematic: 'minimap' }), fields: [] })?.kind).toBe('minimap');
    expect(editorSchematic({ editor: editor({ schematic: 'camera' }), fields: [] })?.kind).toBe('camera');
  });
});
