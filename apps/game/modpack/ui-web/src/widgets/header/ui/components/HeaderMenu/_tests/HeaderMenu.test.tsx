// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { HeaderFrame } from '../../../Header.types';

import { RU } from '../../../../../../shared/i18n/strings';
import { stepBack } from '../../../../../../shared/lib/escape-stack';
import { HeaderMenu } from '../HeaderMenu';

vi.mock('../../../../../../shared/api/protocol/protocol', () => ({ send: vi.fn(() => true) }));

const frame = (onReset = vi.fn()): HeaderFrame => ({
  zoom: 100,
  canZoomIn: true,
  canZoomOut: true,
  zoomIn: vi.fn(),
  zoomOut: vi.fn(),
  handles: { move: { current: null } },
  onRecentre: vi.fn(),
  onReset
});

const openMenu = () => fireEvent.click(screen.getByRole('button', { name: RU.headerMenu }));

describe(HeaderMenu, () => {
  it('stays closed until its button is pressed', () => {
    render(<HeaderMenu frame={frame()} language='ru' />);

    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('holds the zoom, the language and the window reset', () => {
    render(<HeaderMenu frame={frame()} language='ru' />);

    openMenu();

    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByRole('group', { name: RU.language })).toBeTruthy();
    expect(screen.getByRole('button', { name: RU.windowReset })).toBeTruthy();
  });

  it('resets the window and closes', () => {
    const onReset = vi.fn();

    render(<HeaderMenu frame={frame(onReset)} language='ru' />);
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: RU.windowReset }));

    expect(onReset).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('closes on Esc', () => {
    render(<HeaderMenu frame={frame()} language='ru' />);
    openMenu();

    act(() => {
      stepBack();
    });

    expect(screen.queryByRole('menu')).toBeNull();
  });
});
