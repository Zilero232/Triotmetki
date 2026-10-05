import { describe, expect, it } from 'vitest';

import type { TankThreshold } from '../../../../../generated';

import { masteryThresholdLevels, moeThresholdLevels, toMasteryThresholdRecord, toMoeThresholdRecord } from '../threshold-record.mappers';

const row = (kind: TankThreshold['kind']): TankThreshold => ({
  kind,
  tankId: 1,
  source: 'lesta',
  date: new Date('2026-01-01T00:00:00.000Z'),
  level1: 1,
  level2: 2,
  level3: 3,
  level4: 4,
  sampleSize: 10,
  capturedAt: new Date('2026-01-01T00:00:00.000Z')
});

describe('threshold records', () => {
  it('round-trips MoE levels through the stored columns', () => {
    const stored = row('moe');
    const record = toMoeThresholdRecord(stored);

    expect(moeThresholdLevels(record)).toEqual({ level1: stored.level1, level2: stored.level2, level3: stored.level3, level4: stored.level4 });
  });

  it('round-trips mastery levels through the stored columns', () => {
    const stored = row('mastery');
    const record = toMasteryThresholdRecord(stored);

    expect(record && masteryThresholdLevels(record)).toEqual({
      level1: stored.level1,
      level2: stored.level2,
      level3: stored.level3,
      level4: stored.level4
    });
  });

  it('keeps the MoE levels in ascending order', () => {
    const { p65, p85, p95, p100 } = toMoeThresholdRecord(row('moe'));

    expect([p65, p85, p95, p100]).toEqual([p65, p85, p95, p100].sort((a, b) => (a ?? 0) - (b ?? 0)));
  });

  it('keeps the mastery levels in ascending order from class 3 to ace', () => {
    const record = toMasteryThresholdRecord(row('mastery'));
    const levels = record ? [record.class3, record.class2, record.class1, record.master] : [];

    expect(levels).toEqual([...levels].sort((a, b) => a - b));
  });

  it('drops a mastery row without the ace level', () => {
    expect(toMasteryThresholdRecord({ ...row('mastery'), level4: null })).toBeNull();
  });

  it('keeps an MoE row without the 100% level', () => {
    expect(toMoeThresholdRecord({ ...row('moe'), level4: null }).p100).toBeNull();
  });
});
