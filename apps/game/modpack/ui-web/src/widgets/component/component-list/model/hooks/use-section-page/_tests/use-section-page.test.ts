// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { UiSection } from '@/shared/api/protocol';

import { $state, $view, receiveState, SECTION_NAV } from '@/entities/window/window-state';
import stateSample from '@/shared/api/protocol/_tests/fixtures/state.sample.json?raw';

import { useSectionPage } from '../use-section-page';

const sample = stateSample;

const withBattleMarksCard = (): string => {
  const state: { components: { id: string; section: string; context: string }[] } = JSON.parse(sample);
  const marks = state.components.find(({ id }) => id === 'marks_panel');

  return JSON.stringify({ ...state, components: [...state.components, { ...marks, id: 'battle_progress', context: 'battle' }] });
};

const mountPage = (section: UiSection, columns = 1) => renderHook(() => useSectionPage({ section, columns }));

beforeEach(() => {
  $state.set(null);
  $view.set({ section: SECTION_NAV.first });
  receiveState(sample);
});

describe(useSectionPage, () => {
  it('lays the page cards out in columns', () => {
    const marks = mountPage('marks', 2).result.current;

    const ids = marks.columns.map((column) => column.items.map(({ component }) => component.id));

    expect(ids).toEqual([['marks_panel'], ['session_stats']]);
  });

  it('lists the hangar and the battle cards of a page together', () => {
    receiveState(withBattleMarksCard());

    const ids = mountPage('marks').result.current.columns[0]?.items.map(({ component }) => component.id);

    expect(ids).toHaveLength(3);
    expect(ids).toContain('battle_progress');
  });

  it('counts the page components and the enabled ones', () => {
    expect(mountPage('battle').result.current).toMatchObject({ total: 2, enabled: 1, empty: false });
  });

  it('reports a page with no cards as empty', () => {
    expect(mountPage('streamer').result.current.empty).toBe(true);
  });
});
