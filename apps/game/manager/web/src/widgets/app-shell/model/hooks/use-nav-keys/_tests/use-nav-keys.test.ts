import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useNavKeys } from '../use-nav-keys';

const SECTIONS = ['home', 'components'] as const;

const press = (init: KeyboardEventInit) => window.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, ...init }));

describe('useNavKeys', () => {
  it('opens the section of the number pressed with Ctrl', () => {
    const onSelect = vi.fn();

    renderHook(() => useNavKeys({ sections: SECTIONS, onSelect }));
    press({ key: '2', ctrlKey: true });

    expect(onSelect).toHaveBeenCalledWith('components');
  });

  it('ignores a number pressed without Ctrl', () => {
    const onSelect = vi.fn();

    renderHook(() => useNavKeys({ sections: SECTIONS, onSelect }));
    press({ key: '1' });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('ignores Ctrl with another modifier', () => {
    const onSelect = vi.fn();

    renderHook(() => useNavKeys({ sections: SECTIONS, onSelect }));
    press({ key: '1', ctrlKey: true, shiftKey: true });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('ignores a number past the last section', () => {
    const onSelect = vi.fn();

    renderHook(() => useNavKeys({ sections: SECTIONS, onSelect }));
    press({ key: '9', ctrlKey: true });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('stops listening once unmounted', () => {
    const onSelect = vi.fn();
    const { unmount } = renderHook(() => useNavKeys({ sections: SECTIONS, onSelect }));

    unmount();
    press({ key: '1', ctrlKey: true });

    expect(onSelect).not.toHaveBeenCalled();
  });
});
