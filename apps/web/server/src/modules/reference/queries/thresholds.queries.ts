import type { LatestThresholdsInput } from './thresholds.types';

export const latestThresholds = ({ db, kind, upTo, source }: LatestThresholdsInput) => {
  const query = db
    .selectFrom('tank_threshold')
    .distinctOn(['tank_id', 'source'])
    .select([
      'kind',
      'tank_id as tankId',
      'date',
      'source',
      'level_1 as level1',
      'level_2 as level2',
      'level_3 as level3',
      'level_4 as level4',
      'sample_size as sampleSize',
      'captured_at as capturedAt'
    ])
    .where('kind', '=', kind)
    .where('date', '<=', upTo)
    .orderBy('tank_id')
    .orderBy('source')
    .orderBy('date', 'desc');

  return (source === undefined ? query : query.where('source', '=', source)).execute();
};

export const THRESHOLDS_QUERIES = { latestThresholds } as const;
