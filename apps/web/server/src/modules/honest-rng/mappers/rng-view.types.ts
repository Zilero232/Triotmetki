import type { RngAggregate } from '../../../../generated';

export type RngAggregateRow = Omit<RngAggregate, 'computedAt' | 'period' | 'scope'>;
