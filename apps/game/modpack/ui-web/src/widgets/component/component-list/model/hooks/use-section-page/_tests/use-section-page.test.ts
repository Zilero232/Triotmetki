// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { UiSection } from '@/shared/api/protocol';

import { $state, $view, receiveState, SECTION_NAV } from '@/entities/window/window-state';
import stateSample from '@/shared/api/protocol/_tests/fixtures/state.sample.json?raw';

import { useSectionPage } from '../use-section-page';

const sample = stateSample;

const withHangarCard = (): string => {
  const state: { components: { id: string; section: string; context: string }[] } = JSON.parse(sample);
  const session = state.components.find(({ id }) => id === 'session_stats');

  return JSON.stringify({ ...state, components: [...state.components, { ...session, id: 'battle_results', context: 'any' }] });
};

const mountPage = (section: UiSection, columns = 1) => renderHook(() => useSectionPage({ section, columns }));

beforeEach(() => {
  $state.set(null);
  $view.set({ section: SECTION_NAV.first });
  receiveState(sample);
});

describe(useSectionPage, () => {
  it('lays the page cards out in columns', () => {
    const battle = mountPage('battle', 2).result.current;

    const ids = battle.columns.map((column) => column.items.map(({ component }) => component.id));

    expect(ids.flat()).toHaveLength(3);
    expect(ids).toHaveLength(2);
  });

  it('lists the hangar and the battle cards of a page together', () => {
    receiveState(withHangarCard());

    const ids = mountPage('hangar').result.current.columns[0]?.items.map(({ component }) => component.id);

    expect(ids).toHaveLength(2);
    expect(ids).toContain('battle_results');
  });

  it('counts the page components and the enabled ones', () => {
    expect(mountPage('battle').result.current).toMatchObject({ total: 3, enabled: 2, empty: false });
  });

  it('reports a page with no cards as empty', () => {
    expect(mountPage('replays').result.current.empty).toBe(false);
  });
});
