import type { ReactNode } from 'react';

export type FitBoxProps = {
  className?: string;
  max?: number;
  minScale?: number;
  fallback?: ReactNode;
  children: ReactNode;
};
