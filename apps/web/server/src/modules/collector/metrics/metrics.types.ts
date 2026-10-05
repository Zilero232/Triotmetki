import type { Job } from 'bullmq';

import type { CIRCUIT_STATE_NAME } from './config/circuit-breaker.constants';

export type JobContext = {
  queue: string;
};

export type MetricCounters = {
  processed: number;
  failed: number;
  retried: number;
  durationMs: number;
  lestaRequests: number;
  lestaErrors: number;
};

export type TrackJobInput<T> = {
  job: Pick<Job, 'attemptsMade' | 'name' | 'queueName'>;
  run: () => Promise<T>;
};

export type WriteCountersInput = {
  queue: string;
  counters: MetricCounters;
  bucketStart: Date;
};

export type RestoreCountersInput = {
  queue: string;
  counters: MetricCounters;
};

export type RecordJobInput = {
  queue: string;
  durationMs: number;
  ok: boolean;
  retried: boolean;
};

export type CircuitStateName = (typeof CIRCUIT_STATE_NAME)[keyof typeof CIRCUIT_STATE_NAME];

export type CircuitListener = (state: CircuitStateName) => void;
