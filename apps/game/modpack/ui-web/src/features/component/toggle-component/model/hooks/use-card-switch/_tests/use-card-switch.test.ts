// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UiComponent } from '@/shared/api/protocol';

import { send } from '@/shared/api/protocol/protocol';
import { RU } from '@/shared/i18n/strings';

import { useCardSwitch } from '../use-card-switch';

vi.mock('@/shared/api/protocol/protocol', () => ({ send: vi.fn(() => true) }));

const component = (overrides: Partial<UiComponent> = {}): UiComponent => ({
  id: 'replay_manager',
  group: 'hangar',
  section: 'replays',
  context: 'hangar',
  title: 'Replays',
  hint: null,
  switch: { key: 'hangar_replay_manager', value: true },
  fields: [],
  panel: false,
  actions: [],
  page: null,
  ...overrides
});

beforeEach(() => {
  vi.mocked(send).mockClear();
});

describe(useCardSwitch, () => {
  it('flips the switch through a set message', () => {
    const hook = renderHook(() => useCardSwitch(component()));

    act(() => hook.result.current.toggle());

    expect(send).toHaveBeenCalledWith({ type: 'set', component: 'replay_manager', key: 'hangar_replay_manager', value: false });
  });

  it('labels the switch by its value', () => {
    expect(renderHook(() => useCardSwitch(component())).result.current.label).toBe(RU.on);
    expect(renderHook(() => useCardSwitch(component({ switch: { key: 'hangar_replay_manager', value: false } }))).result.current.label).toBe(RU.off);
  });
});
