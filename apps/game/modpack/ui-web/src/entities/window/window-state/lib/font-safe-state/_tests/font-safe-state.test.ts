import { describe, expect, it } from 'vitest';

import type { UiComponent, UiState } from '@/shared/api/protocol';

import { parseState } from '@/shared/api/protocol';
import sample from '@/shared/api/protocol/_tests/fixtures/state.sample.json';

import { fontSafeState } from '..';

const base = (): UiState => {
  const state = parseState(JSON.stringify(sample));

  if (!state) {
    throw new Error('the state fixture does not parse');
  }

  return state;
};

const withFirstComponent = (overrides: Partial<UiComponent>): UiState => {
  const state = base();
  const [first, ...rest] = state.components;

  if (!first) {
    throw new Error('the state fixture has no component');
  }

  return { ...state, components: [{ ...first, ...overrides }, ...rest] };
};

const unsafeField = { key: 'format★', label: 'Формат →', hint: null, type: 'text' as const, value: '{damage} →', default: '→', max_length: 40 };

describe(fontSafeState, () => {
  it('draws the glyphs the client font lacks with ones it has in a hint', () => {
    const state = withFirstComponent({ hint: 'Оборудование (★ — в слоте со своим бонусом) → панель' });

    const safe = fontSafeState(state);

    expect(safe.components[0]?.hint).toBe('Оборудование (* — в слоте со своим бонусом) › панель');
  });

  it('draws the glyphs the client font lacks with ones it has in a title', () => {
    const state = withFirstComponent({ title: 'Мод ✓' });

    const safe = fontSafeState(state);

    expect(safe.components[0]?.title).toBe('Мод +');
  });

  it('draws a field label with the glyphs the client font has', () => {
    const state = withFirstComponent({ fields: [unsafeField] });

    const safe = fontSafeState(state);

    expect(safe.components[0]?.fields[0]).toEqual({ ...unsafeField, label: 'Формат ›' });
  });

  it('leaves the ids the page sends back as they are', () => {
    const state = withFirstComponent({ id: 'id★' });

    const safe = fontSafeState(state);

    expect(safe.components[0]?.id).toBe('id★');
  });

  it('keeps the revision of the state', () => {
    const safe = fontSafeState(base());

    expect(safe.revision).toBe(1);
  });
});
