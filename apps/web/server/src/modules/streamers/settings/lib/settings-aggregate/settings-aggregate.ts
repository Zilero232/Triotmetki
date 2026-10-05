import { STREAMER_SETTINGS_AGGREGATE_FIELDS, zoomMax } from '@otmetki/schemas';
import { countBy, entries, isNonNull, isNumber, sortBy } from 'remeda';
import { median } from 'simple-statistics';
import { z } from 'zod';

import type { AggregateCohortInput, AggregateRow, BucketOfInput, ReadPathInput, ValueOfInput } from './settings-aggregate.types';

import { readRecord } from '../../../../../common/lib';

const readPath = ({ source, path }: ReadPathInput): unknown => path.split('.').reduce<unknown>((value, key) => readRecord(value)[key], source);

const zoomStepsOf = (values: ValueOfInput['values']): string[] | undefined => {
  const parsed = z.array(z.string()).safeParse(readPath({ source: values, path: 'zoom.steps' }));

  return parsed.success ? parsed.data : undefined;
};

const valueOf = ({ values, field }: ValueOfInput): unknown =>
  field === 'zoom.max' ? zoomMax(zoomStepsOf(values)) : readPath({ source: values, path: field });

const medianOf = (numbers: number[]): number | null => (numbers.length === 0 ? null : median(numbers));

const bucketOf = ({ spec, value }: BucketOfInput): string | null => {
  if (spec.kind === 'numeric') {
    return typeof value === 'number' ? (Math.floor(value / spec.step) * spec.step).toFixed(2) : null;
  }

  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ? String(value) : null;
};

export const aggregateCohort = ({ contributions, minCohort, fields = STREAMER_SETTINGS_AGGREGATE_FIELDS }: AggregateCohortInput): AggregateRow[] =>
  fields.flatMap((spec) => {
    const values = contributions.map((values) => valueOf({ values, field: spec.field }));
    const buckets = values.map((value) => bucketOf({ spec, value })).filter(isNonNull);

    if (buckets.length < minCohort) {
      return [];
    }

    const numbers = spec.kind === 'numeric' ? values.filter(isNumber) : [];

    return {
      field: spec.field,
      kind: spec.kind,
      contributors: buckets.length,
      median: spec.kind === 'numeric' ? medianOf(numbers) : null,
      buckets: sortBy(
        entries(countBy(buckets, (bucket) => bucket)).map(([bucket, count]) => ({ bucket, count })),
        [(row) => row.count, 'desc']
      )
    };
  });
