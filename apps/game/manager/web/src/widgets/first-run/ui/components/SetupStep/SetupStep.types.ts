import type { ReactNode } from 'react';

export type SetupStepProps = {
  index: number;
  title: string;
  isDone?: boolean;
  doneLabel: string;
  children: ReactNode;
};
