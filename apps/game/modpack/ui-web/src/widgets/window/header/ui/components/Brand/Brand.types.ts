import type { RefObject } from 'react';

export type BrandProps = {
  compact: boolean;
  dragRef: RefObject<HTMLDivElement | null>;
  onRecentre: () => void;
};
