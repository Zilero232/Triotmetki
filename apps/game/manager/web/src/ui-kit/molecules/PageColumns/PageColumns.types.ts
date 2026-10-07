import type { ReactNode } from 'react';

export type PageColumnsProps = {
  children: ReactNode;
  aside?: ReactNode;
  layout?: 'aside' | 'even';
  isAsideFirst?: boolean;
};
