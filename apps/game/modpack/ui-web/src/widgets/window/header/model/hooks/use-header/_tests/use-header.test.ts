// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { $query, $state, $view, receiveState, SECTION, SECTION_NAV } from '@/entities/window/window-state';
import stateSample from '@/shared/api/protocol/_tests/fixtures/state.sample.json?raw';

import { useHeader } from '../use-header';

const sample = stateSample;

beforeEach(() => {
  $state.set(null);
  $query.set('');
  $view.set({ section: SECTION_NAV.first });
  receiveState(sample);
});

describe(useHeader, () => {
  it('shows the binding state', () => {
    const hook = renderHook(useHeader);

    expect(hook.result.current.account).toMatchObject({ bound: false, title: 'accountUnbound' });
  });

  it('shows no server warning on the production API', () => {
    const hook = renderHook(useHeader);

    expect(hook.result.current.server).toBeNull();
  });

  it('names a non-default server', () => {
    receiveState(sample.replace('"server": null', '"server": "http://127.0.0.1:4000"').replace('"revision": 1', '"revision": 2'));

    const hook = renderHook(useHeader);

    expect(hook.result.current.server).toBe('http://127.0.0.1:4000');
  });

  it('opens the data page from the binding state', () => {
    const hook = renderHook(useHeader);

    act(() => hook.result.current.openAccount());

    expect($view.get().section).toBe(SECTION.data);
  });

  it('types into the shared search', async () => {
    const hook = renderHook(useHeader);

    act(() => hook.result.current.setQuery('лог'));
    await act(async () => {});

    expect(hook.result.current).toMatchObject({ query: 'лог', searching: true });
  });

  it('stops searching once the query is cleared', async () => {
    const hook = renderHook(useHeader);

    act(() => hook.result.current.setQuery('лог'));
    await act(async () => {});

    act(() => hook.result.current.clearQuery());
    await act(async () => {});

    expect(hook.result.current.searching).toBe(false);
  });
});
