import { describe, expect, it } from 'vitest';

import { API_USAGE_REPORT } from '../../../config/api-usage.constants';
import { topEndpoints, usagePointOf, usagePoints } from '../usage';

const row = ({
  day,
  endpoint,
  requests,
  latencyMsTotal = requests * 10
}: {
  day: string;
  endpoint: string;
  requests: number;
  latencyMsTotal?: number;
}) => ({
  day,
  endpoint,
  requests,
  errors: 0,
  throttled: 0,
  latencyMsTotal
});

describe('usagePoints', () => {
  it('sums the endpoints of a day and averages the latency per request', () => {
    const [point] = usagePoints([
      row({ day: '2026-09-25', endpoint: 'GET /a', requests: 2, latencyMsTotal: 30 }),
      row({ day: '2026-09-25', endpoint: 'GET /b', requests: 1, latencyMsTotal: 30 })
    ]);

    expect(point).toEqual({ day: '2026-09-25', requests: 3, errors: 0, throttled: 0, avgLatencyMs: 20 });
  });

  it('orders the days', () => {
    const days = usagePoints([
      row({ day: '2026-09-26', endpoint: 'GET /a', requests: 1 }),
      row({ day: '2026-09-24', endpoint: 'GET /a', requests: 1 })
    ]).map((point) => point.day);

    expect(days).toEqual(['2026-09-24', '2026-09-26']);
  });
});

describe('usagePointOf', () => {
  it('reports a day without requests as zero with no latency', () => {
    expect(usagePointOf({ rows: [], day: '2026-09-25' })).toEqual({ day: '2026-09-25', requests: 0, errors: 0, throttled: 0, avgLatencyMs: null });
  });
});

describe('topEndpoints', () => {
  it('ranks the busiest endpoints first and keeps only the top ones', () => {
    const rows = Array.from({ length: API_USAGE_REPORT.topEndpoints + 2 }, (_, index) =>
      row({ day: '2026-09-25', endpoint: `GET /${index}`, requests: index + 1 })
    );

    const top = topEndpoints(rows);

    expect(top).toHaveLength(API_USAGE_REPORT.topEndpoints);
    expect(top[0]?.requests).toBeGreaterThan(top[1]?.requests ?? 0);
  });
});
