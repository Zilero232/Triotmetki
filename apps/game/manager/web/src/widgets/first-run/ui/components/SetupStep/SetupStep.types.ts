import type { ReactNode } from 'react';

export type SetupStepProps = {
  title: string;
  isDone?: boolean;
  children: ReactNode;
};
