import type { ApiUsagePoint } from '@otmetki/schemas';

import { groupBy, sortBy, sumBy } from 'remeda';

import type { TopEndpoint, UsagePointInput, UsageRow } from './usage.types';

import { API_USAGE_REPORT } from '../../config/api-usage.constants';

const toPoint = ({ day, rows }: UsagePointInput): ApiUsagePoint => {
  const requests = sumBy(rows, (row) => row.requests);
  const latency = sumBy(rows, (row) => row.latencyMsTotal);

  return {
    day,
    requests,
    errors: sumBy(rows, (row) => row.errors),
    throttled: sumBy(rows, (row) => row.throttled),
    avgLatencyMs: requests > 0 ? Math.round(latency / requests) : null
  };
};

export const usagePoints = (rows: readonly UsageRow[]): ApiUsagePoint[] =>
  sortBy(Object.entries(groupBy(rows, (row) => row.day)), ([day]) => day).map(([day, dayRows]) => toPoint({ day, rows: dayRows }));

export const usagePointOf = ({ rows, day }: UsagePointInput): ApiUsagePoint => toPoint({ day, rows: rows.filter((row) => row.day === day) });

export const topEndpoints = (rows: readonly UsageRow[]): TopEndpoint[] =>
  sortBy(
    Object.entries(groupBy(rows, (row) => row.endpoint)).map(([endpoint, endpointRows]) => ({
      endpoint,
      requests: sumBy(endpointRows, (row) => row.requests)
    })),
    [(entry) => entry.requests, 'desc']
  ).slice(0, API_USAGE_REPORT.topEndpoints);
