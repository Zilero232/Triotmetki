// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KEYS } from '@/shared/config';

import { useTextField } from '../use-text-field';

const TYPED = '{damage} / {assist}';

const mount = (value: string) => {
  const onCommit = vi.fn();

  return { onCommit, hook: renderHook(() => useTextField({ value, onCommit })) };
};

describe(useTextField, () => {
  it('keeps the typed text without committing it', () => {
    const { hook, onCommit } = mount('{damage}');

    act(() => hook.result.current.edit(TYPED));

    expect(hook.result.current.text).toBe(TYPED);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it('commits the typed text on Enter', () => {
    const { hook, onCommit } = mount('{damage}');

    act(() => hook.result.current.edit(TYPED));
    act(() => hook.result.current.onKey(KEYS.enter));

    expect(onCommit).toHaveBeenCalledWith(TYPED);
  });

  it('shows the value again once the draft is committed', () => {
    const { hook } = mount('{damage}');

    act(() => hook.result.current.edit(TYPED));
    act(() => hook.result.current.onKey(KEYS.enter));

    expect(hook.result.current.text).toBe('{damage}');
  });

  it('sends nothing when nothing was typed', () => {
    const { hook, onCommit } = mount('abc');

    act(() => hook.result.current.commit());

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('sends nothing when the typed text equals the value', () => {
    const { hook, onCommit } = mount('abc');

    act(() => hook.result.current.edit('abc'));
    act(() => hook.result.current.commit());

    expect(onCommit).not.toHaveBeenCalled();
  });

  it('lets Esc leave the field when nothing is typed', () => {
    const { hook } = mount('{damage}');

    expect(hook.result.current.onEscape).toBeUndefined();
  });

  it('discards the typed text on Esc, so the blur that follows commits nothing', () => {
    const { hook, onCommit } = mount('{damage}');

    act(() => hook.result.current.edit(TYPED));
    act(() => hook.result.current.onEscape?.());
    act(() => hook.result.current.commit());

    expect(hook.result.current.text).toBe('{damage}');
    expect(onCommit).not.toHaveBeenCalled();
  });
});
