import type { ReactNode } from 'react';

export type TankSilhouetteProps = {
  shape: string | null;
  fill: number;
  color: string;
  tick?: number | null;
  width: number;
  className?: string;
  children?: ReactNode;
};
