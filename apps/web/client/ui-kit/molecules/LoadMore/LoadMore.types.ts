import type { ReactNode } from 'react';

export type LoadMoreProps = {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isError: boolean;
  label?: ReactNode;
  className?: string;
  onLoadMore: () => void;
};
