import type { ReactNode } from 'react';

export type ScrollAreaProps = {
  className?: string;
  contentClassName?: string;
  label?: string;
  initialTop?: number;
  onScrollEnd?: (top: number) => void;
  children: ReactNode;
};
