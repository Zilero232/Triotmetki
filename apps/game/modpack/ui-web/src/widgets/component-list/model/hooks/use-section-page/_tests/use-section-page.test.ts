// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

import type { UiSection } from '../../../../../../shared/api/protocol';

import { $state, $view, CONTEXT_FILTER, receiveState, SECTION_NAV } from '../../../../../../entities/window-state';
import { useSectionPage } from '../use-section-page';

const sample = readFileSync(path.resolve(import.meta.dirname, '../../../../../../shared/api/protocol/_tests/fixtures/state.sample.json'), 'utf8');

const withBattleMarksCard = (): string => {
  const state: { components: { id: string; section: string; context: string }[] } = JSON.parse(sample);
  const marks = state.components.find(({ id }) => id === 'marks_panel');

  return JSON.stringify({ ...state, components: [...state.components, { ...marks, id: 'battle_progress', context: 'battle' }] });
};

const mountPage = (section: UiSection, columns = 1) => renderHook(() => useSectionPage({ section, columns }));

beforeEach(() => {
  $state.set(null);
  $view.set({ section: SECTION_NAV.first, expanded: [], context: CONTEXT_FILTER.all });
  receiveState(sample);
});

describe(useSectionPage, () => {
  it('lays the page cards out in columns', () => {
    const marks = mountPage('marks', 2).result.current;

    const ids = marks.columns.map((column) => column.items.map(({ component }) => component.id));

    expect(ids).toEqual([['marks_panel'], ['session_stats']]);
  });

  it('offers the context filter on a page with hangar and battle cards', () => {
    receiveState(withBattleMarksCard());

    expect(mountPage('marks').result.current.showFilter).toBe(true);
  });

  it('hides the context filter when the other cards work anywhere', () => {
    expect(mountPage('marks').result.current.showFilter).toBe(false);
  });

  it('counts the page components and the enabled ones', () => {
    expect(mountPage('battle').result.current).toMatchObject({ total: 2, enabled: 1, empty: false });
  });

  it('filters the cards by where a component works', async () => {
    receiveState(withBattleMarksCard());
    const marks = mountPage('marks');

    act(() => marks.result.current.setContext(CONTEXT_FILTER.hangar));
    await act(async () => {});

    expect(marks.result.current.columns[0]?.items.map(({ component }) => component.id)).toEqual(['marks_panel', 'session_stats']);
  });

  it('tells an empty page from an empty filter', () => {
    expect(mountPage('streamer').result.current).toMatchObject({ empty: true, filteredEmpty: false });
  });
});
