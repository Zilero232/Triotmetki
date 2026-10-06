import { describe, expect, it } from 'vitest';

import type { UiComponent } from '@/shared/api/protocol';

import { parseState } from '@/shared/api/protocol';
import stateSample from '@/shared/api/protocol/_tests/fixtures/state.sample.json?raw';

import {
  changedFields,
  componentIcon,
  componentsOf,
  currentValues,
  defaultValues,
  labelOf,
  searchComponents,
  summarize,
  valueOf
} from '../components';

const sample = stateSample;

const components = (): UiComponent[] => parseState(sample)?.components ?? [];

const byId = (id: string): UiComponent => {
  const found = components().find((component) => component.id === id);

  if (!found) {
    throw new Error(id);
  }

  return found;
};

const zoomedMinimap = (): UiComponent => {
  const minimap = byId('minimap');

  return { ...minimap, fields: minimap.fields.map((field) => (field.type === 'choice' ? { ...field, value: 'x2' } : field)) };
};

const idsOf = (list: UiComponent[]): string[] => list.map(({ id }) => id);

const searchKeys = (query: string) =>
  searchComponents({ components: components(), query }).map(({ component, fields }) => [component.id, fields.map(({ key }) => key)]);

describe(componentsOf, () => {
  it('keeps a page to its own cards, sorted by title', () => {
    const titles = componentsOf({ components: components(), section: 'battle' }).map(({ title }) => title);

    expect(titles).toEqual(['Журнал боя', 'Отметки в бою', 'minimap']);
  });

  it('sorts Cyrillic titles first, ignoring case and ё, the same on every machine', () => {
    const titled = (title: string): UiComponent => ({ ...byId('minimap'), title });
    const list = ['zoom', 'Жук', 'Ёж', 'арта', 'Alpha'].map(titled);

    const titles = componentsOf({ components: list, section: 'battle' }).map(({ title }) => title);

    expect(titles).toEqual(['арта', 'Ёж', 'Жук', 'Alpha', 'zoom']);
  });

  it('puts the hangar cards on the hangar page', () => {
    const cards = componentsOf({ components: components(), section: 'hangar' });

    expect(idsOf(cards)).toEqual(['session_stats']);
  });
});

describe(summarize, () => {
  it('lists every page in the navigation order', () => {
    const summaries = summarize(components());

    expect(summaries.map(({ section }) => section)).toEqual(['battle', 'hangar', 'replays', 'data', 'hud']);
  });

  it('counts the switched-off cards of a page apart', () => {
    const summaries = summarize(components());

    expect(summaries.find(({ section }) => section === 'battle')).toEqual({ section: 'battle', total: 3, enabled: 2 });
    expect(summaries.find(({ section }) => section === 'replays')).toEqual({ section: 'replays', total: 1, enabled: 1 });
  });
});

describe(searchComponents, () => {
  it('finds a card by its title and shows all of its settings', () => {
    const [hit] = searchComponents({ components: components(), query: 'СЕССИЯ' });

    expect(hit?.component.id).toBe('session_stats');
    expect(hit?.fields).toHaveLength(1);
  });

  it('finds a single setting by its label', () => {
    expect(searchKeys('простоя')).toEqual([['session_stats', ['session_idle_minutes']]]);
  });

  it('finds a single setting by one of its choices, ignoring case', () => {
    const [hit] = searchKeys('ctrl+alt');

    expect(hit?.[1]).toEqual(['hud_modifier']);
  });

  it('waits for two letters', () => {
    expect(searchComponents({ components: components(), query: ' о ' })).toEqual([]);
  });
});

describe(changedFields, () => {
  it('lists nothing for a card at its defaults', () => {
    expect(changedFields(byId('damage_log'))).toEqual([]);
  });

  it('lists the fields that differ from their defaults', () => {
    const changed = changedFields(zoomedMinimap());

    expect(changed.map(({ key }) => key)).toEqual(['zoom']);
  });
});

describe(defaultValues, () => {
  it('gives the default side of a reset', () => {
    expect(defaultValues(zoomedMinimap())).toEqual({ zoom: 'native' });
  });
});

describe(currentValues, () => {
  it('gives the current side of a reset', () => {
    expect(currentValues(zoomedMinimap())).toEqual({ zoom: 'x2' });
  });
});

describe(valueOf, () => {
  it('reads the switch of a card', () => {
    expect(valueOf({ component: byId('companion'), key: 'enabled' })).toBe(true);
  });

  it('reads a field by its key', () => {
    expect(valueOf({ component: byId('session_stats'), key: 'session_idle_minutes' })).toBe(60);
  });

  it('reads null for an unknown key', () => {
    expect(valueOf({ component: byId('companion'), key: 'missing' })).toBeNull();
  });
});

describe(labelOf, () => {
  it('labels the switch with the card title', () => {
    const label = labelOf({ component: byId('companion'), key: 'enabled' });

    expect(label).toBe('Данные и сайт');
  });
});

describe(componentIcon, () => {
  it('draws a known card with its own icon', () => {
    expect(componentIcon('damage_log')).toBe('scroll-text');
  });

  it('draws a new card with the fallback icon', () => {
    expect(componentIcon('brand_new')).toBe('puzzle');
  });
});
