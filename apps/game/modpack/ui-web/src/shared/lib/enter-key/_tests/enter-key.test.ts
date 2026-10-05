import { describe, expect, it, vi } from 'vitest';

import { KEYS } from '@/shared/config';

import { onEnterKey } from '../enter-key';

describe(onEnterKey, () => {
  it('runs the action on Enter', () => {
    const action = vi.fn();

    onEnterKey(action)(KEYS.enter);

    expect(action).toHaveBeenCalledTimes(1);
  });

  it('ignores any other key', () => {
    const action = vi.fn();

    onEnterKey(action)('Escape');

    expect(action).not.toHaveBeenCalled();
  });
});
