// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { send } from '@/shared/api/protocol/protocol';
import { KEYS } from '@/shared/config';

import { useBindForm } from '../use-bind-form';

vi.mock('@/shared/api/protocol/protocol', () => ({ send: vi.fn(() => true) }));

const typed = (code: string) => {
  const hook = renderHook(useBindForm);

  act(() => hook.result.current.setCode(code));

  return hook;
};

beforeEach(() => {
  vi.mocked(send).mockClear();
});

describe(useBindForm, () => {
  it('allows binding once a code is typed', () => {
    const hook = typed('  ABCD-1234 ');

    expect(hook.result.current.canBind).toBe(true);
  });

  it('sends the trimmed code', () => {
    const hook = typed('  ABCD-1234 ');

    act(() => hook.result.current.bind());

    expect(send).toHaveBeenCalledWith({ type: 'bind', code: 'ABCD-1234' });
  });

  it('clears the field after binding', () => {
    const hook = typed('  ABCD-1234 ');

    act(() => hook.result.current.bind());

    expect(hook.result.current.code).toBe('');
  });

  it('sends nothing for a blank code', () => {
    const hook = typed('   ');

    act(() => hook.result.current.bind());

    expect(send).not.toHaveBeenCalled();
  });

  it('binds on Enter', () => {
    const hook = typed('CODE');

    act(() => hook.result.current.onKey(KEYS.enter));

    expect(send).toHaveBeenCalledWith({ type: 'bind', code: 'CODE' });
  });
});
