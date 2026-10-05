import type { ReplayFilters, ReplaySort } from '@/entities/replay/replay';

import type { BrowserView, ViewOfInput } from './browser-view.types';

export const viewOf = ({ page, raw, enabled, shown }: ViewOfInput): BrowserView => {
  if (!enabled) {
    return 'off';
  }

  if (raw === undefined) {
    return 'indexing';
  }

  if (raw === null || page === null) {
    return 'invalid';
  }

  if (page.status === 'no_account') {
    return 'no_account';
  }

  if (page.items.length === 0) {
    return page.status === 'indexing' ? 'indexing' : 'empty';
  }

  return shown === 0 ? 'nothing' : 'list';
};

export const sortedBy =
  (sort: ReplaySort) =>
  (current: ReplayFilters): ReplayFilters =>
    current.sort === sort ? { ...current, descending: !current.descending } : { ...current, sort, descending: true };
