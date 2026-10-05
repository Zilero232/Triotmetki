import { describe, expect, it } from 'vitest';

import type { QueueCell } from '../../../map-stats.types';

import { MAP_STATS } from '../../../config/map-stats.constants';
import { queueNow, zoneHour } from '../queue-hours';

const cell = (tier: number, hour: number, medianSec: number, samples: number = MAP_STATS.minQueueSamples): QueueCell => ({
  tier,
  hour,
  samples,
  avgSec: medianSec,
  medianSec,
  p90Sec: medianSec * 2
});

describe('zoneHour', () => {
  it('buckets the same instant into different hours in different zones', () => {
    const at = new Date('2026-09-26T12:30:00Z');

    expect(zoneHour({ at, zone: 'UTC' })).toBe(at.getUTCHours());
    expect(zoneHour({ at, zone: MAP_STATS.timezone })).not.toBe(zoneHour({ at, zone: 'UTC' }));
  });

  it('wraps a late UTC evening into the small hours of the next day', () => {
    const at = new Date('2026-09-26T23:30:00Z');
    const hour = zoneHour({ at, zone: MAP_STATS.timezone });

    expect(hour).toBeGreaterThanOrEqual(0);
    expect(hour).toBeLessThan(at.getUTCHours());
  });
});

describe('queueNow', () => {
  const cells = [
    cell(10, 20, 40),
    cell(10, 4, 90),
    cell(10, 12, 25),
    cell(8, 20, 15),
    cell(6, 20, 10, MAP_STATS.minQueueSamples - 1),
    cell(MAP_STATS.allTiers, 20, 30)
  ];

  const now = queueNow({ cells, hour: 20, tier: 10, minSamples: MAP_STATS.minQueueSamples });

  it('picks the selected tier at the current hour', () => {
    expect(now.selected?.tier).toBe(10);
    expect(now.selected?.hour).toBe(20);
  });

  it('finds the hour with the shortest median wait for the selected tier', () => {
    const selectedTier = cells.filter((entry) => entry.tier === 10);

    expect(now.fastest?.medianSec).toBe(Math.min(...selectedTier.map((entry) => entry.medianSec)));
  });

  it('lists every tier at the current hour except the overall row and thin samples', () => {
    expect(now.tiers.map((entry) => entry.tier)).toEqual([8, 10]);
  });

  it('reports nothing when there are no samples', () => {
    expect(queueNow({ cells: [], hour: 3, tier: 10, minSamples: MAP_STATS.minQueueSamples })).toEqual({
      hour: 3,
      selected: null,
      fastest: null,
      tiers: []
    });
  });
});
