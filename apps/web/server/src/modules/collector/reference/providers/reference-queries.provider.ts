import { latestSpecHistory } from '../queries/latest-spec-history.queries';
import { moeEstimatePoints } from '../queries/moe-estimate.queries';

export const REFERENCE_QUERIES = Symbol('REFERENCE_QUERIES');

export const referenceQueries = { latestSpecHistory, moeEstimatePoints };

export const referenceQueriesProvider = { provide: REFERENCE_QUERIES, useValue: referenceQueries };
