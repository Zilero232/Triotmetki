import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import type { UiComponent } from '../../../../../shared/api/protocol';

import { parseState } from '../../../../../shared/api/protocol';
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

const sample = readFileSync(path.resolve(import.meta.dirname, '../../../../../shared/api/protocol/_tests/fixtures/state.sample.json'), 'utf8');

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
    const titles = componentsOf({ components: components(), section: 'battle', context: 'all' }).map(({ title }) => title);

    expect(titles).toEqual(['Журнал боя', 'minimap']);
  });

  it('sorts Cyrillic titles first, ignoring case and ё, the same on every machine', () => {
    const titled = (title: string): UiComponent => ({ ...byId('minimap'), title });
    const list = ['zoom', 'Жук', 'Ёж', 'арта', 'Alpha'].map(titled);

    const titles = componentsOf({ components: list, section: 'battle', context: 'all' }).map(({ title }) => title);

    expect(titles).toEqual(['арта', 'Ёж', 'Жук', 'Alpha', 'zoom']);
  });

  it('keeps the hangar filter to the cards shown in the hangar', () => {
    const cards = componentsOf({ components: components(), section: 'marks', context: 'hangar' });

    expect(idsOf(cards)).toEqual(['marks_panel', 'session_stats']);
  });

  it('keeps the battle filter to the cards shown in battle', () => {
    const cards = componentsOf({ components: components(), section: 'marks', context: 'battle' });

    expect(idsOf(cards)).toEqual(['marks_panel']);
  });

  it('keeps a card shown everywhere under the battle filter', () => {
    const cards = componentsOf({ components: components(), section: 'data', context: 'battle' });

    expect(idsOf(cards)).toEqual(['companion']);
  });
});

describe(summarize, () => {
  it('lists every page in the navigation order', () => {
    const summaries = summarize(components());

    expect(summaries.map(({ section }) => section)).toEqual(['battle', 'hangar', 'marks', 'replays', 'streamer', 'data', 'hud']);
  });

  it('counts the switched-off cards of a page apart', () => {
    const summaries = summarize(components());

    expect(summaries.find(({ section }) => section === 'battle')).toEqual({ section: 'battle', total: 2, enabled: 1 });
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
