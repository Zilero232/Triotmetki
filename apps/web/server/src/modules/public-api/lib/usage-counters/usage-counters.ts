import type { AddCountersInput, EndpointLabelInput, UsageCounters } from './usage-counters.types';

import { API_USAGE } from '../../config/public-api.constants';

export const endpointLabel = ({ method, route }: EndpointLabelInput): string => `${method.toUpperCase()} ${route ?? API_USAGE.unmatchedEndpoint}`;

export const emptyCounters = (): UsageCounters => ({ requests: 0, errors: 0, throttled: 0, latencyMs: 0 });

export const addCounters = ({ left, right }: AddCountersInput): UsageCounters => ({
  requests: left.requests + right.requests,
  errors: left.errors + right.errors,
  throttled: left.throttled + right.throttled,
  latencyMs: left.latencyMs + right.latencyMs
});
