import { Global, Module } from '@nestjs/common';

import { LESTA_OUTCOME_RECORDER } from '../../../core';
import { metricsQueriesProvider } from './providers/metrics-queries.provider';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { MetricsService } from './services/metrics.service';

@Global()
@Module({
  providers: [metricsQueriesProvider, CircuitBreakerService, MetricsService, { provide: LESTA_OUTCOME_RECORDER, useExisting: MetricsService }],
  exports: [CircuitBreakerService, MetricsService, LESTA_OUTCOME_RECORDER]
})
export class MetricsModule {}
