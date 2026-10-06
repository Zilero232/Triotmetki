import { PERF } from '@/entities/catalog';
import { pickLocalized } from '@/shared/lib';

import type { BuildCatalogRowsInput, CatalogRow, FilterCatalogRowsInput, WithDependenciesInput } from './catalog-rows.types';

import { COMPONENT_CATALOG } from '../../config';

const withDependencies = ({ components, id }: WithDependenciesInput): Set<string> => {
  const byId = new Map(components.map((component) => [component.id, component]));
  const result = new Set<string>();
  const pending = [id];

  while (pending.length > 0) {
    const next = pending.pop();
    const component = next === undefined ? undefined : byId.get(next);

    if (component && !result.has(component.id)) {
      result.add(component.id);
      pending.push(...component.dependencies);
    }
  }

  return result;
};

export const buildCatalogRows = ({ catalog, installation, locale, fresh = [] }: BuildCatalogRowsInput): CatalogRow[] => {
  const states = new Map(installation?.components.map((component) => [component.id, component.state]));
  const titles = new Map(catalog.components.map((component) => [component.id, pickLocalized({ text: component.title, locale })]));
  const librariesOf = (id: string) => {
    const pulled = withDependencies({ components: catalog.components, id });

    return catalog.dependencies
      .filter((dependency) => !dependency.optional && dependency.requiredBy.some((component) => pulled.has(component)))
      .map((dependency) => pickLocalized({ text: dependency.title, locale }));
  };

  return catalog.components.map((component) => ({
    id: component.id,
    category: component.category,
    title: titles.get(component.id) ?? component.id,
    description: pickLocalized({ text: component.description, locale }),
    fairPlay: pickLocalized({ text: component.fairPlay, locale }),
    required: component.required,
    state: states.get(component.id) ?? 'missing',
    dependencies: component.dependencies.map((id) => titles.get(id) ?? id),
    libraries: librariesOf(component.id),
    image: component.preview.image,
    video: component.preview.video,
    audio: component.preview.audio,
    perf: component.perf,
    generator: component.generator,
    isNew: fresh.includes(component.id)
  }));
};

export const filterCatalogRows = ({ rows, category, query, lightOnly }: FilterCatalogRowsInput): CatalogRow[] => {
  const needle = query.trim().toLocaleLowerCase();

  return rows.filter(
    (row) =>
      (category === COMPONENT_CATALOG.allCategories || row.category === category) &&
      (!lightOnly || row.perf === PERF.light) &&
      (needle === '' || `${row.title} ${row.description}`.toLocaleLowerCase().includes(needle))
  );
};
