// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UiComponent, UiEditor } from '@/shared/api/protocol';

import { $editor, openEditor } from '@/entities/window/window-state';
import { send } from '@/shared/api/protocol/protocol';
import { RU } from '@/shared/i18n/strings';
import { stepBack } from '@/shared/lib/escape-stack';

import { ComponentEditor } from '../ComponentEditor';

vi.mock('@/shared/api/protocol/protocol', () => ({ send: vi.fn(() => true) }));

const EDITOR: UiEditor = {
  groups: [
    { id: 'shape', label: 'Mark group', keys: ['mark'] },
    { id: 'colour', label: 'Colour group', keys: ['mark_color'] },
    { id: 'size', label: 'Size group', keys: ['mark_size'] }
  ],
  icons: { mark: { dot: 'img://gui/maps/icons/otmetki/crosshair/otmetki/dot_64.png' } },
  swatches: { mark_color: { white: '#f2f2f3', red: '#ff4a3d' } }
};

const COMPONENT: UiComponent = {
  id: 'crosshair',
  group: 'battle',
  section: 'battle',
  context: 'battle',
  title: 'Crosshairs',
  hint: 'Looks only',
  switch: { key: 'crosshair_presets', value: true },
  fields: [
    {
      key: 'mark',
      label: 'Centre mark',
      hint: 'An image over the reticle centre',
      type: 'choice',
      value: 'none',
      default: 'none',
      choices: [
        { value: 'none', label: 'Game own' },
        { value: 'dot', label: 'Dot' }
      ]
    },
    {
      key: 'mark_color',
      label: 'Mark colour',
      hint: null,
      type: 'choice',
      value: 'white',
      default: 'white',
      choices: [
        { value: 'white', label: 'White' },
        { value: 'red', label: 'Red' }
      ]
    },
    { key: 'mark_size', label: 'Mark size', hint: 'Side in pixels', type: 'int', value: 48, default: 48, min: 16, max: 128 },
    {
      key: 'modes',
      label: 'Apply to',
      hint: null,
      type: 'choice',
      value: 'both',
      default: 'both',
      choices: [
        { value: 'both', label: 'Both' },
        { value: 'sniper', label: 'Sniper' }
      ]
    }
  ],
  panel: true,
  actions: [],
  page: null,
  editor: EDITOR
};

const mountEditor = () => render(<ComponentEditor component={COMPONENT} editor={EDITOR} />);

const hintBox = (): HTMLElement | null => document.querySelector('[aria-live="polite"]');

beforeEach(() => {
  vi.mocked(send).mockClear();
  openEditor(COMPONENT.id);
});

describe(ComponentEditor, () => {
  it('lays the fields out in the editor groups in order', () => {
    mountEditor();

    const labels = screen.getAllByRole('group').map((group) => group.getAttribute('aria-label'));

    expect(labels.filter((label) => label?.endsWith(' group'))).toEqual(['Mark group', 'Colour group', 'Size group']);
  });

  it('puts a field no group names under the last group', () => {
    mountEditor();

    const other = screen.getByRole('group', { name: RU.editorOther });

    expect(other.textContent).toContain('Apply to');
  });

  it('shows the marks as a gallery with the chosen one pressed', () => {
    mountEditor();

    const chosen = screen.getByRole('button', { name: 'Game own' });

    expect(chosen.getAttribute('aria-pressed')).toBe('true');
  });

  it('draws a gallery thumbnail from the client image', () => {
    mountEditor();

    const thumb = screen.getByRole('button', { name: 'Dot' }).querySelector('img');

    expect(thumb?.getAttribute('src')).toBe('img://gui/maps/icons/otmetki/crosshair/otmetki/dot_64.png');
  });

  it('applies a mark in one click', () => {
    mountEditor();

    act(() => screen.getByRole('button', { name: 'Dot' }).click());

    expect(send).toHaveBeenCalledWith({ type: 'set', component: 'crosshair', key: 'mark', value: 'dot' });
  });

  it('picks a colour from the swatches', () => {
    mountEditor();

    act(() => screen.getByRole('button', { name: 'Red' }).click());

    expect(send).toHaveBeenCalledWith({ type: 'set', component: 'crosshair', key: 'mark_color', value: 'red' });
  });

  it('paints each swatch in its colour', () => {
    mountEditor();

    const chip = screen.getByRole('button', { name: 'Red' }).querySelector('span');

    expect(chip?.style.backgroundColor).toBe('rgb(255, 74, 61)');
  });

  it('shows the component hint until the pointer is over a setting', () => {
    mountEditor();

    expect(hintBox()?.textContent).toBe('CrosshairsLooks only');
  });

  it('shows the hint of the setting under the pointer', () => {
    mountEditor();

    fireEvent.mouseEnter(screen.getByText('Mark size'));

    expect(hintBox()?.textContent).toBe('Mark sizeSide in pixels');
  });

  it('names the option under the pointer with its setting hint', () => {
    mountEditor();

    fireEvent.mouseEnter(screen.getByRole('button', { name: 'Dot' }));

    expect(hintBox()?.textContent).toBe('DotAn image over the reticle centre');
  });

  it('keeps the preview on screen next to the controls', () => {
    mountEditor();

    expect(screen.getByText(RU.preview)).toBeTruthy();
  });

  it('captions every sample after the panel preview', () => {
    const editor: UiEditor = { ...EDITOR, samples: [{ id: 'card', label: 'Tank card in the hangar', widget: { kind: 'unknown', v: 1, data: {} } }] };

    render(<ComponentEditor component={{ ...COMPONENT, panel: false }} editor={editor} />);

    expect(screen.getByText('Tank card in the hangar')).toBeTruthy();
  });

  it('draws the schematic of a stock element instead of a preview', () => {
    render(<ComponentEditor component={{ ...COMPONENT, panel: false }} editor={{ ...EDITOR, schematic: 'minimap' }} />);

    expect(screen.getByText(RU.schematicCaption)).toBeTruthy();
  });

  it('closes on its close button', () => {
    mountEditor();

    act(() => screen.getByRole('button', { name: RU.editorClose }).click());

    expect($editor.get()).toBeNull();
  });

  it('closes on Esc', () => {
    mountEditor();

    act(() => {
      stepBack();
    });

    expect($editor.get()).toBeNull();
  });
});
