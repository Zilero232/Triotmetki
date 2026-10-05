import catalogFixture from '@contract/catalog.json';
import conflictsFixture from '@contract/conflicts.json';
import { describe, expect, it } from 'vitest';

import { catalogSchema } from '@/entities/catalog';
import { conflictReportSchema } from '@/entities/conflict';

import { conflictItems, restorableCount } from '../conflict-items';

const catalog = catalogSchema.parse(catalogFixture);
const report = conflictReportSchema.parse(conflictsFixture);

describe('conflictItems', () => {
  it('turns every finding into one item, named by the catalogue', () => {
    const items = conflictItems({ report, catalog, locale: 'ru' });

    expect(items.map((item) => item.kind)).toEqual(['missing', 'replaced', 'duplicate', 'foreign', 'overrideResMods']);
    expect(items[0]?.components).toEqual(['Компонент marks_panel']);
    expect(items[3]).toMatchObject({ subject: 'XVM', components: ['Компонент damage_log'], note: 'Свой лог урона' });
  });

  it('falls back to ids without a catalogue', () => {
    const items = conflictItems({ report, catalog: null, locale: 'en' });

    expect(items[0]?.components).toEqual(['marks_panel']);
    expect(items[3]).toMatchObject({ subject: 'xvm', note: null });
  });

  it('is empty for a clean folder', () => {
    expect(conflictItems({ report: { missing: [], replaced: [], duplicates: [], foreign: [], overrides: [] }, catalog, locale: 'ru' })).toEqual([]);
  });
});

describe('restorableCount', () => {
  it('counts the packages to download again', () => {
    expect(restorableCount(report)).toBe(2);
  });
});
