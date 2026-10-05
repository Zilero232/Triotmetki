import type { MoeThresholdRecord } from '../../reference';
import type { HistorySourceRow } from '../lib/moe-history/moe-history.types';

import { toIsoDate } from '../../../common/lib';

export const toHistorySourceRow = (row: MoeThresholdRecord): HistorySourceRow => ({
  tankId: row.tankId,
  date: toIsoDate(row.date) ?? '',
  source: row.source,
  p65: row.p65,
  p85: row.p85,
  p95: row.p95,
  p100: row.p100
});
