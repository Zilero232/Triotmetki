// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { HudPanel } from '@/shared/api/hud-protocol';

import type { HudLabelModel } from '../../model/hooks';
import type { HudLabelProps } from '../components/HudLabel/HudLabel.types';

import { useHudOverlay } from '../../model/hooks';
import { HudOverlay } from '../HudOverlay';

vi.mock('../../model/hooks', () => ({ useHudOverlay: vi.fn() }));

vi.mock('../components', () => ({
  HudHint: () => null,
  HudLabel: ({ id }: HudLabelProps) => {
    if (id === 'broken') {
      throw new Error('label failed');
    }

    return <span>{id}</span>;
  }
}));

const SCREEN = { width: 1920, height: 1080 };

const panelOf = (id: string): HudPanel => ({
  id,
  text: id,
  x: 0,
  y: 0,
  align_x: 'left',
  align_y: 'top',
  alpha: 1,
  drag: false,
  border: false,
  visible: true,
  scale: 1,
  kind: 'label',
  widget: null
});

const labelOf = (id: string): HudLabelModel => ({
  id,
  panel: panelOf(id),
  lines: [],
  widget: null,
  style: { opacity: 1 },
  button: false,
  interactive: false,
  pressable: false,
  framed: false,
  dragging: false,
  measureRef: () => undefined
});

const overlayOf = (ids: string[]): ReturnType<typeof useHudOverlay> => ({
  labels: ids.map(labelOf),
  hint: null,
  edit: false,
  screen: SCREEN,
  style: { width: '1920rem', height: '1080rem' }
});

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe(HudOverlay, () => {
  it('keeps the other panels on the HUD when one throws while it renders', () => {
    vi.mocked(useHudOverlay).mockReturnValue(overlayOf(['left', 'broken', 'right']));

    const html = render(<HudOverlay />).container;

    expect(html.textContent).toBe('leftright');
  });
});
