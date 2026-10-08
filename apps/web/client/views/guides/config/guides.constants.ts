import { parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server';

import type { GuideKind, GuideSort } from '@/entities/guide/guide';

const GUIDE_KINDS = ['tank', 'map', 'general'] as const satisfies readonly GuideKind[];

export const GUIDE_KIND_FILTERS = ['all', ...GUIDE_KINDS] as const;

export const GUIDE_SORTS = ['recent', 'popular'] as const satisfies readonly GuideSort[];

export const GUIDE_LIST = {
  pageSize: 20,
  anyMap: 'any',
  authorsShown: 10,
  skeletonRows: [0, 1, 2],
  skeletonHeight: 36
} as const;

export const GUIDE_FILTER_PARSERS = {
  kind: parseAsStringLiteral(GUIDE_KINDS),
  tank: parseAsInteger,
  map: parseAsString,
  sort: parseAsStringLiteral(GUIDE_SORTS).withDefault('recent')
} as const;
