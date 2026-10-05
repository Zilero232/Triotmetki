import { describe, expect, it } from 'vitest';

import { aggregateCohort } from '../settings-aggregate';

const fields = [
  { field: 'controls.sensitivity.sniper', kind: 'numeric', step: 0.05 },
  { field: 'display.preset', kind: 'categorical' },
  { field: 'zoom.max', kind: 'categorical' }
] as const;

const contributors = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    controls: { sensitivity: { sniper: 0.3 + (index % 3) * 0.05 } },
    display: { preset: index % 2 === 0 ? ('medium' as const) : ('high' as const) },
    zoom: { steps: index < 12 ? (['x2', 'x16'] as const).slice() : (['x2', 'x8'] as const).slice() }
  }));

describe('aggregateCohort', () => {
  it('writes nothing below the k threshold', () => {
    expect(aggregateCohort({ contributions: contributors(19), minCohort: 20, fields })).toEqual([]);
  });

  it('buckets numbers and counts categories at k', () => {
    const rows = aggregateCohort({ contributions: contributors(20), minCohort: 20, fields });
    const sens = rows.find((row) => row.field === 'controls.sensitivity.sniper');
    const preset = rows.find((row) => row.field === 'display.preset');
    const zoom = rows.find((row) => row.field === 'zoom.max');

    expect(sens?.contributors).toBe(20);
    expect(sens?.median).toBeCloseTo(0.35);
    expect(sens?.buckets.reduce((sum, bucket) => sum + bucket.count, 0)).toBe(20);

    expect(preset?.buckets).toEqual([
      { bucket: 'medium', count: 10 },
      { bucket: 'high', count: 10 }
    ]);

    expect(zoom?.buckets[0]).toEqual({ bucket: 'x16', count: 12 });
  });

  it('skips a field too few people filled', () => {
    const contributions = contributors(20).map((values, index) => (index < 5 ? values : { display: values.display }));

    expect(aggregateCohort({ contributions, minCohort: 20, fields }).map((row) => row.field)).toEqual(['display.preset']);
  });
});
