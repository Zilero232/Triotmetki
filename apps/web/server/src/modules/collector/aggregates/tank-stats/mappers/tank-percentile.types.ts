import type { tankPercentileRows } from '../queries/tank-percentiles.queries';

export type ToTankPercentileRecordInput = {
  row: Awaited<ReturnType<typeof tankPercentileRows>>[number];
  date: Date;
};
