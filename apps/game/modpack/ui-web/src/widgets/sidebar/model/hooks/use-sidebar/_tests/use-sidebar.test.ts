// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

import { $query, $state, $view, CONTEXT_FILTER, receiveState, SECTION, SECTION_NAV } from '../../../../../../entities/window-state';
import { useSidebar } from '../use-sidebar';

const sample = readFileSync(path.resolve(import.meta.dirname, '../../../../../../shared/api/protocol/_tests/fixtures/state.sample.json'), 'utf8');

beforeEach(() => {
  $state.set(null);
  $query.set('');
  $view.set({ section: SECTION_NAV.first, expanded: [], context: CONTEXT_FILTER.all });
  receiveState(sample);
});

describe(useSidebar, () => {
  it('lists the component pages with how many are on', () => {
    const { components } = renderHook(useSidebar).result.current;

    const counts = components.map(({ section, count }) => [section, count]);

    expect(counts).toEqual([
      ['battle', '1 вкл.'],
      ['hangar', null],
      ['marks', '2 вкл.'],
      ['replays', '1 вкл.'],
      ['streamer', null],
      ['data', '1 вкл.']
    ]);
  });

  it('lists the tools after the component pages', () => {
    const { tools } = renderHook(useSidebar).result.current;

    expect(tools.map(({ section }) => section)).toEqual([SECTION.profiles, SECTION.hud]);
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
