import type { MasteryThreshold as MasteryThresholdDto, MoeThreshold as MoeThresholdDto } from '@otmetki/schemas';

import type { MasteryThresholdRecord, MoeThresholdRecord } from '../reference.types';

import { isoDay } from '../../../common/lib';

export const toMoeThreshold = (row: MoeThresholdRecord): MoeThresholdDto => ({
  tankId: row.tankId,
  date: isoDay(row.date),
  source: row.source,
  p65: row.p65,
  p85: row.p85,
  p95: row.p95,
  p100: row.p100
});

export const toMasteryThreshold = (row: MasteryThresholdRecord): MasteryThresholdDto => ({
  tankId: row.tankId,
  date: isoDay(row.date),
  source: row.source,
  class3: row.class3,
  class2: row.class2,
  class1: row.class1,
  master: row.master
});
