// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { $query, $state, $view, receiveState, SECTION, SECTION_NAV } from '@/entities/window/window-state';
import stateSample from '@/shared/api/protocol/_tests/fixtures/state.sample.json?raw';

import { useSidebar } from '../use-sidebar';

const sample = stateSample;

beforeEach(() => {
  $state.set(null);
  $query.set('');
  $view.set({ section: SECTION_NAV.first });
  receiveState(sample);
});

describe(useSidebar, () => {
  it('lists the component pages with how many are on', () => {
    const { components } = renderHook(useSidebar).result.current;

    const counts = components.map(({ section, count }) => [section, count]);

    expect(counts).toEqual([
      ['battle', '2 вкл.'],
      ['hangar', '1 вкл.'],
      ['replays', '1 вкл.']
    ]);
  });

  it('lists the tools after the component pages', () => {
    const { tools } = renderHook(useSidebar).result.current;

    expect(tools.map(({ section }) => section)).toEqual([SECTION.profiles, SECTION.hud, SECTION.data]);
  });

  it('marks the current page active', () => {
    const { components } = renderHook(useSidebar).result.current;

    expect(components[0]?.active).toBe(true);
  });

  it('opens a page', async () => {
    const hook = renderHook(useSidebar);

    act(() => hook.result.current.tools[0]?.open());
    await act(async () => {});

    expect($view.get().section).toBe(SECTION.profiles);
    expect(hook.result.current.tools[0]?.active).toBe(true);
  });

  it('marks nothing active while a search is shown', async () => {
    const hook = renderHook(useSidebar);

    act(() => hook.result.current.tools[0]?.open());
    await act(async () => {});

    act(() => $query.set('zoom'));
    await act(async () => {});

    expect(hook.result.current.tools[0]?.active).toBe(false);
  });
});
