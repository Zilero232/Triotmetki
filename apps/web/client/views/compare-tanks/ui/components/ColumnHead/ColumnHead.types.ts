import type { VehicleSummary } from '@otmetki/schemas';

export type ColumnHeadProps = {
  vehicle: VehicleSummary;
  isStatsError: boolean;
  onRemove: () => void;
  onRetryStats: () => void;
};
