import catalogFixture from '@contract/catalog.json';
import conflictsFixture from '@contract/conflicts.json';
import { describe, expect, it } from 'vitest';

import { catalogSchema } from '@/entities/catalog';
import { conflictReportSchema } from '@/entities/conflict';

import { conflictItems, restorableCount } from '../conflict-items';

const catalog = catalogSchema.parse(catalogFixture);
const report = conflictReportSchema.parse(conflictsFixture);
const CLEAN = { missing: [], replaced: [], duplicates: [], foreign: [], overrides: [] };

describe('conflictItems', () => {
  it('turns every finding into one item, in a fixed order of kinds', () => {
    const items = conflictItems({ report, catalog, locale: 'ru' });

    expect(items.map((item) => item.kind)).toEqual(['missing', 'replaced', 'duplicate', 'foreign', 'overrideResMods']);
  });

  it('names the missing components by the catalogue', () => {
    const [missing] = conflictItems({ report, catalog, locale: 'ru' });

    expect(missing?.components).toEqual(['Компонент marks_panel']);
  });

  it('names a foreign conflict by its catalogue rule', () => {
    const foreign = conflictItems({ report, catalog, locale: 'ru' }).find((item) => item.kind === 'foreign');

    expect(foreign).toMatchObject({ subject: 'XVM', components: ['Компонент damage_log'], note: 'Свой лог урона' });
  });

  it('falls back to component ids without a catalogue', () => {
    const [missing] = conflictItems({ report, catalog: null, locale: 'en' });

    expect(missing?.components).toEqual(['marks_panel']);
  });

  it('falls back to the rule id and no note without a catalogue', () => {
    const foreign = conflictItems({ report, catalog: null, locale: 'en' }).find((item) => item.kind === 'foreign');

    expect(foreign).toMatchObject({ subject: 'xvm', note: null });
  });

  it('tells an override in mods from one in res_mods', () => {
    const overrides = { ...CLEAN, overrides: [{ file: 'a.mtmod', location: 'mods' as const, paths: ['res/a'], count: 1 }] };

    expect(conflictItems({ report: overrides, catalog, locale: 'ru' }).map((item) => item.kind)).toEqual(['override']);
  });

  it('marks a duplicate of our own package', () => {
    const duplicates = { ...CLEAN, duplicates: [{ packageId: 'net.triotmetki.core', files: ['a', 'b'], ours: true }] };

    expect(conflictItems({ report: duplicates, catalog, locale: 'ru' }).map((item) => item.kind)).toEqual(['duplicateOurs']);
  });

  it('is empty for a clean folder', () => {
    expect(conflictItems({ report: CLEAN, catalog, locale: 'ru' })).toEqual([]);
  });
});

describe('restorableCount', () => {
  it('counts the packages to download again', () => {
    expect(restorableCount(report)).toBe(2);
  });
});
