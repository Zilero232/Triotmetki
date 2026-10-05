import type { Database } from '../../../core';
import type { PULSE_QUERIES } from './pulse.queries';

export type ActivityByHourInput = {
  db: Database;
  since: Date;
  now: Date;
};

export type PulseQueries = typeof PULSE_QUERIES;
