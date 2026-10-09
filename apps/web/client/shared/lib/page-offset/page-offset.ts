import { PAGINATION } from '@otmetki/schemas';
import { isDeepEqual } from 'remeda';

import type { OffsetPage, SameListKeyInput } from './page-offset.types';

export const nextPageOffset = ({ items, total, offset }: OffsetPage): number | undefined => {
  const next = offset + items.length;

  return items.length > 0 && next < total && next <= PAGINATION.maxOffset ? next : undefined;
};

export const isSameListKey = ({ previous, next }: SameListKeyInput): boolean => {
  if (previous === undefined || previous.length !== next.length) {
    return false;
  }

  return isDeepEqual(previous.slice(0, -1), next.slice(0, -1));
};
