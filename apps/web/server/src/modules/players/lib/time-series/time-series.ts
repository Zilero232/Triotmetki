import type { TankTotals } from '@otmetki/ratings';
import type { TimeSeriesPoint } from '@otmetki/schemas';

import { accountWn8, averageTier, bronyaIndex, eff, sumTotals } from '@otmetki/ratings';
import { groupBy, sortBy } from 'remeda';
import { match } from 'ts-pattern';

import type { BucketTankRow, SeriesPointsInput } from './time-series.types';

import { winRatePercent } from '../../../../common/lib';

const toTotals = (row: BucketTankRow): TankTotals => ({
  tankId: row.tank_id,
  battles: row.battles,
  wins: row.wins,
  damageDealt: row.damage,
  frags: row.frags,
  spotted: row.spotted,
  capturePoints: row.cap,
  droppedCapturePoints: row.def
});

export const seriesPoints = ({ rows, metric, expected, tiers, references }: SeriesPointsInput): TimeSeriesPoint[] => {
  const buckets = groupBy(rows, (row) => row.bucket.toISOString());

  return sortBy(Object.entries(buckets), ([at]) => at).map(([at, bucketRows]) => {
    const tanks = bucketRows.map(toTotals);
    const totals = sumTotals(tanks);
    const { battles } = totals;

    const value = match(metric)
      .with('battles', () => battles)
      .with('winRate', () => winRatePercent(totals))
      .with('avgDamage', () => (battles > 0 ? totals.damageDealt / battles : null))
      .with('wn8', () => accountWn8({ tanks, expected }).wn8)
      .with('eff', () => {
        const tier = averageTier({ tanks, tiers });

        return tier === null ? null : eff({ totals, averageTier: tier });
      })
      .with('broneIndex', () => (references.size === 0 ? null : bronyaIndex({ tanks, references }).index))
      .exhaustive();

    return { at, value, battles };
  });
};
