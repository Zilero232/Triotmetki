import { act, fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useCommandPaletteState } from '../use-command-palette-state';

describe('useCommandPaletteState', () => {
  it('keeps the palette unmounted until it is first opened', () => {
    const { result } = renderHook(() => useCommandPaletteState());

    expect(result.current.hasOpened).toBe(false);
  });

  it('mounts the palette once a trigger opens it and keeps it mounted after closing', () => {
    const { result } = renderHook(() => useCommandPaletteState());

    act(() => result.current.setOpen(true));
    act(() => result.current.setOpen(false));

    expect(result.current.hasOpened).toBe(true);
  });

  it('mounts and opens the palette from the hotkey', () => {
    const { result } = renderHook(() => useCommandPaletteState());

    act(() => {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    });

    expect(result.current.isOpen).toBe(true);
    expect(result.current.hasOpened).toBe(true);
  });

  it('does not mount the palette when it is only closed', () => {
    const { result } = renderHook(() => useCommandPaletteState());

    act(() => result.current.setOpen(false));

    expect(result.current.hasOpened).toBe(false);
  });
});
