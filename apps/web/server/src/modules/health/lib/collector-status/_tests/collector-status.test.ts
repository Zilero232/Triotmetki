import { COLLECTOR_JOBS } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';

import { jobSuccessKey } from '../../../../collector/metrics';
import { COLLECTOR_JOB_SOURCES } from '../../../config/health.constants';
import { collectorJobs, toQueueBacklog } from '../collector-status';

const EARLY = '2026-09-29T08:00:00.000Z';
const LATE = '2026-09-29T09:00:00.000Z';

const jobOf = (jobs: ReturnType<typeof collectorJobs>, name: (typeof COLLECTOR_JOBS)[number]) => jobs.find((job) => job.job === name);

describe('collectorJobs', () => {
  it('lists every collector job, null where nothing ever succeeded', () => {
    const jobs = collectorJobs({ successes: {}, xvmVersion: null, gameFiles: null });

    expect(jobs.map((job) => job.job)).toEqual([...COLLECTOR_JOBS]);
    expect(jobs.every((job) => job.lastSuccessAt === null && job.version === null)).toBe(true);
  });

  it('takes the latest success among the queues that feed one job', () => {
    const [first, second] = COLLECTOR_JOB_SOURCES.lestaSync;
    const jobs = collectorJobs({ successes: { [jobSuccessKey(first)]: LATE, [jobSuccessKey(second)]: EARLY }, xvmVersion: null, gameFiles: null });

    expect(jobOf(jobs, 'lestaSync')?.lastSuccessAt).toBe(LATE);
  });

  it('reports the expected-values version only on its own job', () => {
    const jobs = collectorJobs({ successes: {}, xvmVersion: '2026-09-28', gameFiles: null });

    expect(jobOf(jobs, 'xvmExpected')?.version).toBe('2026-09-28');
    expect(jobOf(jobs, 'moeImport')?.version).toBeNull();
  });

  it('reads the game-files import from the imported version, not from a queue', () => {
    const jobs = collectorJobs({ successes: {}, xvmVersion: null, gameFiles: { version: '2.1.0', importedAt: EARLY } });

    expect(jobOf(jobs, 'gameFiles')).toEqual({ job: 'gameFiles', lastSuccessAt: EARLY, version: '2.1.0' });
  });
});

describe('toQueueBacklog', () => {
  it('folds the prioritized and paused jobs into the waiting count', () => {
    const [backlog] = toQueueBacklog({
      'collector.poll': { waiting: 3, prioritized: 2, paused: 1, active: 4, delayed: 5, failed: 6, lagSeconds: 7 }
    });

    expect(backlog).toEqual({ queue: 'collector.poll', waiting: 6, active: 4, delayed: 5, failed: 6, lagSeconds: 7 });
  });

  it('treats a missing counter as zero and orders queues by name', () => {
    const backlog = toQueueBacklog({ 'collector.sweep': {}, 'collector.aggregate': { failed: 1 } });

    expect(backlog.map((row) => row.queue)).toEqual(['collector.aggregate', 'collector.sweep']);
    expect(backlog[1]).toMatchObject({ waiting: 0, lagSeconds: 0 });
  });
});
