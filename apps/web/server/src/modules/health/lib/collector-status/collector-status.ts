import type { CollectorJob, QueueBacklog } from '@otmetki/schemas';

import { COLLECTOR_JOBS } from '@otmetki/schemas';
import { firstBy, sortBy, sumBy } from 'remeda';

import type { CollectorJobsInput, CountOfInput, QueueCounts } from './collector-status.types';

import { jobSuccessKey } from '../../../collector/metrics';
import { COLLECTOR_JOB_SOURCES, QUEUE_COUNTS } from '../../config/health.constants';

const countOf = ({ counts, states }: CountOfInput): number => Math.max(0, Math.round(sumBy(states, (state) => counts[state] ?? 0)));

export const toQueueBacklog = (queues: Readonly<Record<string, QueueCounts>>): QueueBacklog[] =>
  sortBy(
    Object.entries(queues).map(([queue, counts]) => ({
      queue,
      waiting: countOf({ counts, states: QUEUE_COUNTS.waiting }),
      active: countOf({ counts, states: QUEUE_COUNTS.active }),
      delayed: countOf({ counts, states: QUEUE_COUNTS.delayed }),
      failed: countOf({ counts, states: QUEUE_COUNTS.failed }),
      lagSeconds: countOf({ counts, states: QUEUE_COUNTS.lag })
    })),
    (backlog) => backlog.queue
  );

export const collectorJobs = ({ successes, xvmVersion, gameFiles }: CollectorJobsInput): CollectorJob[] =>
  COLLECTOR_JOBS.map((job) => {
    if (job === 'gameFiles') {
      return { job, lastSuccessAt: gameFiles?.importedAt ?? null, version: gameFiles?.version ?? null };
    }

    const times = COLLECTOR_JOB_SOURCES[job].flatMap((source) => {
      const at = successes[jobSuccessKey(source)];

      return at === undefined ? [] : [at];
    });

    return {
      job,
      lastSuccessAt: firstBy(times, [(at) => Date.parse(at), 'desc']) ?? null,
      version: job === 'xvmExpected' ? xvmVersion : null
    };
  });
