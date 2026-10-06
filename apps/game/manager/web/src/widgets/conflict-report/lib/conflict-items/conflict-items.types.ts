import type { Catalog } from '@/entities/catalog';
import type { ConflictReport } from '@/entities/conflict';
import type { Locale } from '@/shared/i18n';

export type ConflictKind = 'duplicate' | 'duplicateOurs' | 'foreign' | 'missing' | 'override' | 'overrideResMods' | 'replaced';

export type ConflictItem = {
  key: string;
  kind: ConflictKind;
  subject: string;
  components: string[];
  files: string[];
  count: number;
  note: string | null;
};

export type ConflictItemsInput = {
  report: ConflictReport;
  catalog: Pick<Catalog, 'components' | 'conflicts'> | null;
  locale: Locale;
};

export type ConflictNamesInput = Omit<ConflictItemsInput, 'report'>;

export type ConflictRule = Catalog['conflicts'][number];

export type ConflictNames = {
  titleOf: (id: string) => string;
  ruleOf: (id: string) => ConflictRule | undefined;
  locale: Locale;
};

export type KindInput = {
  report: ConflictReport;
  names: ConflictNames;
};
