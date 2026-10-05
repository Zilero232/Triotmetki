import { mergeCollectorState } from '../queries/collector-state.queries';

export const METRICS_QUERIES = Symbol('METRICS_QUERIES');

export const metricsQueries = { mergeCollectorState };

export const metricsQueriesProvider = { provide: METRICS_QUERIES, useValue: metricsQueries };
