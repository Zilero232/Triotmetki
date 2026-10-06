import type { Catalog, Perf } from '@/entities/catalog';
import type { ComponentState, Installation } from '@/entities/installation';
import type { Locale } from '@/shared/i18n';

export type CatalogRow = {
  id: string;
  category: string;
  title: string;
  description: string;
  fairPlay: string;
  required: boolean;
  state: ComponentState;
  dependencies: string[];
  libraries: string[];
  image: string | null;
  video: string | null;
  audio: string | null;
  perf: Perf | null;
  generator: string | null;
  isNew: boolean;
};

export type BuildCatalogRowsInput = {
  catalog: Pick<Catalog, 'components' | 'dependencies'>;
  installation: Pick<Installation, 'components'> | null;
  locale: Locale;
  fresh?: readonly string[];
};

export type WithDependenciesInput = {
  components: Catalog['components'];
  id: string;
};

export type FilterCatalogRowsInput = {
  rows: readonly CatalogRow[];
  category: string;
  query: string;
  lightOnly: boolean;
};
