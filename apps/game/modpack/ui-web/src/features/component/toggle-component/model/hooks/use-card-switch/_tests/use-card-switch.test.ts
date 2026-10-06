// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { UiComponent } from '@/shared/api/protocol';

import { $components, $editor, $state, receiveState } from '@/entities/window/window-state';
import stateSample from '@/shared/api/protocol/_tests/fixtures/state.sample.json?raw';

import { useCardSwitch } from '../use-card-switch';

const part = (owner: string): UiComponent => {
  const [base] = $components.get();

  if (!base) {
    throw new Error('the state sample has no components');
  }

  return { ...base, id: 'last_battle', switch: null, owner };
};

beforeEach(() => {
  $state.set(null);
  $editor.set(null);
  receiveState(stateSample);
});

describe(useCardSwitch, () => {
  it('names the card that switches a part without its own switch', () => {
    const { result } = renderHook(() => useCardSwitch(part('session_stats')));

    expect(result.current.owner?.title).toBe($components.get().find(({ id }) => id === 'session_stats')?.title);
  });

  it('opens the owner card', () => {
    const { result } = renderHook(() => useCardSwitch(part('session_stats')));

    act(() => result.current.owner?.open());

    expect($editor.get()).toBe('session_stats');
  });

  it('has no owner for an unknown card', () => {
    expect(renderHook(() => useCardSwitch(part('missing'))).result.current.owner).toBeNull();
  });
});
