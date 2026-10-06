import catalogFixture from '@contract/catalog.json';
import installationFixture from '@contract/installation.json';
import { describe, expect, it } from 'vitest';

import { catalogSchema } from '@/entities/catalog';
import { installationSchema } from '@/entities/installation';

import { COMPONENT_CATALOG } from '../../../config';
import { buildCatalogRows, filterCatalogRows } from '../catalog-rows';

const catalog = catalogSchema.parse(catalogFixture);
const installation = installationSchema.parse(installationFixture);
const rows = buildCatalogRows({ catalog, installation, locale: 'en' });

describe('buildCatalogRows', () => {
  it('takes each state from the installation and marks the rest as missing', () => {
    const states = new Map(installation.components.map((component) => [component.id, component.state]));

    expect(rows.every((row) => row.state === (states.get(row.id) ?? 'missing'))).toBe(true);
  });

  it('names dependencies by their titles', () => {
    const hitLog = rows.find((row) => row.id === 'hit_log');
    const damageLog = rows.find((row) => row.id === 'damage_log');

    expect(hitLog?.dependencies).toEqual([damageLog?.title]);
  });

  it('lists the third-party libraries a component and the components it pulls in need', () => {
    const libraries = Object.fromEntries(rows.map((row) => [row.id, row.libraries]));

    expect(libraries).toMatchObject({
      core: [],
      marks_panel: ['OpenWG Gameface'],
      damage_log: ['OpenWG Gameface', 'GUIFlash'],
      hit_log: ['OpenWG Gameface', 'GUIFlash']
    });
  });

  it('leaves out the optional libraries switching a component on never installs', () => {
    const dependencies = catalog.dependencies.map((dependency) => ({ ...dependency, optional: dependency.id === 'guiflash' }));
    const optionalRows = buildCatalogRows({ catalog: { ...catalog, dependencies }, installation, locale: 'en' });

    expect(optionalRows.find((row) => row.id === 'damage_log')?.libraries).toEqual(['OpenWG Gameface']);
  });

  it('carries the FPS cost of each component', () => {
    expect(rows.find((row) => row.id === 'damage_log')?.perf).toBe('medium');
  });

  it('carries the sound preview of each component', () => {
    expect(rows.every((row) => row.audio === null)).toBe(true);
  });

  it('marks the components the installed release changed as new', () => {
    const marked = buildCatalogRows({ catalog, installation, locale: 'ru', fresh: ['hit_log'] });

    expect(marked.filter((row) => row.isNew).map((row) => row.id)).toEqual(['hit_log']);
  });

  it('marks nothing as new without a list of changed components', () => {
    expect(rows.some((row) => row.isNew)).toBe(false);
  });

  it('treats a missing installation as nothing installed', () => {
    expect(buildCatalogRows({ catalog, installation: null, locale: 'ru' }).every((row) => row.state === 'missing')).toBe(true);
  });
});

describe('filterCatalogRows', () => {
  it('keeps every row for all categories and an empty query', () => {
    expect(filterCatalogRows({ rows, category: COMPONENT_CATALOG.allCategories, query: '  ', lightOnly: false })).toHaveLength(rows.length);
  });

  it('finds a row by a case-insensitive query', () => {
    const [first] = rows;
    const found = filterCatalogRows({ rows, category: first?.category ?? '', query: first?.title.toUpperCase() ?? '', lightOnly: false });

    expect(found.map((row) => row.id)).toContain(first?.id);
  });

  it('keeps only the rows of the chosen category', () => {
    const [first] = rows;
    const found = filterCatalogRows({ rows, category: first?.category ?? '', query: '', lightOnly: false });

    expect(found.every((row) => row.category === first?.category)).toBe(true);
  });

  it('keeps only the light components when asked', () => {
    const light = filterCatalogRows({ rows, category: COMPONENT_CATALOG.allCategories, query: '', lightOnly: true });

    expect(light.every((row) => row.perf === 'low')).toBe(true);
  });

  it('drops a heavier component when only light ones are asked for', () => {
    const light = filterCatalogRows({ rows, category: COMPONENT_CATALOG.allCategories, query: '', lightOnly: true });

    expect(light.map((row) => row.id)).not.toContain('damage_log');
  });
});
