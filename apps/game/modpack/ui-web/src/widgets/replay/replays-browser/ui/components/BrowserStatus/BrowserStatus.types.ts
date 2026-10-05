import type { ReactNode } from 'react';

export type BrowserStatusProps = {
  title?: string;
  text: string;
  progress?: number | null;
  children?: ReactNode;
};
