// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import type { UiSection } from '@/shared/api/protocol';

import { $state, $view, CONTEXT_FILTER, receiveState, SECTION_NAV } from '@/entities/window/window-state';
import stateSample from '@/shared/api/protocol/_tests/fixtures/state.sample.json?raw';

import { useSectionCards } from '../use-section-cards';

const sample = stateSample;

const cardsOf = (section: UiSection) => renderHook(() => useSectionCards({ section, columns: 1 })).result.current;

beforeEach(() => {
  $state.set(null);
  $view.set({ section: SECTION_NAV.first, expanded: [], context: CONTEXT_FILTER.hangar });
  receiveState(sample);
});

describe(useSectionCards, () => {
  it('lists the cards of a tool page whatever the context filter says', () => {
    const hud = cardsOf('hud');

    expect(hud.empty).toBe(false);
    expect(hud.columns[0]?.items.map(({ component }) => component.id)).toEqual(['hud_layouts']);
  });

  it('reports a page with no cards as empty', () => {
    const streamer = cardsOf('streamer');

    expect(streamer.empty).toBe(true);
  });
});
