import { describe, expect, it } from 'vitest';

import { API_USAGE } from '../../../config/public-api.constants';
import { addCounters, emptyCounters, endpointLabel } from '../usage-counters';

describe('endpointLabel', () => {
  it('names the route pattern, not the concrete path', () => {
    expect(endpointLabel({ method: 'get', route: '/v1/players/:id' })).toBe('GET /v1/players/:id');
  });

  it('groups unmatched requests together', () => {
    expect(endpointLabel({ method: 'GET', route: undefined })).toBe(`GET ${API_USAGE.unmatchedEndpoint}`);
  });
});

describe('addCounters', () => {
  it('adds every counter', () => {
    const one = { requests: 1, errors: 1, throttled: 0, latencyMs: 5 };

    expect(addCounters({ left: one, right: one })).toEqual({ requests: 2, errors: 2, throttled: 0, latencyMs: 10 });
    expect(addCounters({ left: emptyCounters(), right: one })).toEqual(one);
  });
});
