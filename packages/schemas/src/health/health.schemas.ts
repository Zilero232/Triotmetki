import { z } from 'zod';

import { countSchema, isoDateTimeSchema } from '../common/primitives/primitives.schemas';
import {
  COLLECTOR_JOBS,
  HEALTH_CIRCUIT_STATES,
  HEALTH_INDICATOR_STATUSES,
  HEALTH_STATUSES,
  HEALTH_WORKER_MODES,
  HEALTH_WORKER_STATES
} from './health.constants';

const healthStatusSchema = z.enum(HEALTH_STATUSES);

const healthIndicatorStatusSchema = z.enum(HEALTH_INDICATOR_STATUSES);

const connectionIndicatorSchema = z.object({
  status: healthIndicatorStatusSchema,
  message: z.string().optional().describe('Why the connection check failed')
});

const workerIndicatorSchema = z.object({
  status: healthIndicatorStatusSchema,
  state: z.enum(HEALTH_WORKER_STATES).describe('Freshness of the collector heartbeat: ok, stale or never seen'),
  mode: z.enum(HEALTH_WORKER_MODES).optional().describe('Set while the collector runs without a Lesta application id'),
  collectedAt: isoDateTimeSchema.optional().describe('When the collector last wrote its heartbeat')
});

const lestaCircuitIndicatorSchema = z.object({
  status: healthIndicatorStatusSchema,
  state: z.enum(HEALTH_CIRCUIT_STATES).describe('Circuit breaker in front of the Lesta API')
});

export const healthDetailsSchema = z.object({
  database: connectionIndicatorSchema.optional(),
  redis: connectionIndicatorSchema.optional(),
  worker: workerIndicatorSchema.optional(),
  lestaCircuit: lestaCircuitIndicatorSchema.optional()
});

export const collectorJobSchema = z.object({
  job: z.enum(COLLECTOR_JOBS),
  lastSuccessAt: isoDateTimeSchema.nullable().describe('When the job last finished without an error; null when it never has'),
  version: z.string().nullable().describe('Version of the data the job last loaded, when the source has one')
});

export const queueBacklogSchema = z.object({
  queue: z.string(),
  waiting: countSchema,
  active: countSchema,
  delayed: countSchema,
  failed: countSchema,
  lagSeconds: countSchema.describe('Age of the oldest waiting job')
});

export const collectorHealthSchema = z.object({
  jobs: z.array(collectorJobSchema),
  queues: z.array(queueBacklogSchema),
  queuesCollectedAt: isoDateTimeSchema.nullable().describe('When the worker last counted its queues'),
  lastModBattleAt: isoDateTimeSchema.nullable().describe('When the latest battle from the game mod arrived')
});

const buildInfoSchema = z.object({
  version: z.string(),
  commit: z.string().nullable().describe('Commit the API was built from; null when the build did not record it')
});

export const healthSchema = z.object({
  status: healthStatusSchema,
  info: healthDetailsSchema.optional(),
  error: healthDetailsSchema.optional(),
  details: healthDetailsSchema,
  collector: collectorHealthSchema,
  build: buildInfoSchema
});
