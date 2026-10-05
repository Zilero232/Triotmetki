import type { VehicleSummary } from '@otmetki/schemas';

export type TankCellProps = {
  vehicle: VehicleSummary;
  image?: 'contour' | 'small';
  imageHideBelow?: 'md';
  className?: string;
};
