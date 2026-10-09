import type { QueryKey } from '@tanstack/react-query';

export type OffsetPage = {
  items: readonly unknown[];
  total: number;
  offset: number;
};

export type SameListKeyInput = {
  previous: QueryKey | undefined;
  next: QueryKey;
};
