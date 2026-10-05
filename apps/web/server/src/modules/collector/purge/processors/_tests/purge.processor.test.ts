import { Job } from 'bullmq';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../metrics';
import type { PurgeService, RetentionService } from '../../services';

import { JOB } from '../../../contracts';
import { PurgeProcessor } from '../purge.processor';

const requestId = '00000000-0000-4000-8000-000000000001';

const createProcessor = () => {
  const purge = mock<PurgeService>();
  const retention = mock<RetentionService>();
  const metrics = mock<MetricsService>();

  metrics.track.mockImplementation(({ run }) => run());

  return { purge, retention, processor: new PurgeProcessor(purge, retention, metrics) };
};

describe('PurgeProcessor', () => {
  it('reports how many purges were dispatched', async () => {
    const { purge, processor } = createProcessor();

    purge.dispatch.mockResolvedValue(3);

    expect(await processor.process(mock<Job>({ name: JOB.purge.dispatch, data: {} }))).toEqual({ dispatched: 3 });
    expect(purge.purgeAccount).not.toHaveBeenCalled();
  });

  it('runs the retention purge on the retention job', async () => {
    const { purge, retention, processor } = createProcessor();

    retention.purgeExpired.mockResolvedValue({ collector_job_metric: 42 });

    expect(await processor.process(mock<Job>({ name: JOB.purge.retention, data: {} }))).toEqual({ deleted: { collector_job_metric: 42 } });
    expect(purge.purgeAccount).not.toHaveBeenCalled();
  });

  it('purges the account from the payload', async () => {
    const { purge, processor } = createProcessor();

    expect(
      await processor.process(mock<Job>({ name: JOB.purge.account, data: { accountId: 5, requestId }, attemptsMade: 0, opts: { attempts: 3 } }))
    ).toEqual({
      purged: true
    });

    expect(purge.purgeAccount).toHaveBeenCalledWith({ accountId: 5, requestId, isFinalAttempt: false });
  });

  it('tells the purge when it runs the last attempt', async () => {
    const { purge, processor } = createProcessor();

    await processor.process(mock<Job>({ name: JOB.purge.account, data: { accountId: 5, requestId }, attemptsMade: 2, opts: { attempts: 3 } }));

    expect(purge.purgeAccount).toHaveBeenCalledWith({ accountId: 5, requestId, isFinalAttempt: true });
  });

  it('fails the job without purging on a malformed payload', async () => {
    const { purge, processor } = createProcessor();

    await expect(processor.process(mock<Job>({ name: JOB.purge.account, data: { accountId: 'five', requestId } }))).rejects.toThrow();
    expect(purge.purgeAccount).not.toHaveBeenCalled();
  });

  it('lets a failed purge fail the job so it is retried', async () => {
    const { purge, processor } = createProcessor();

    purge.purgeAccount.mockRejectedValue(new Error('lock timeout'));

    await expect(processor.process(mock<Job>({ name: JOB.purge.account, data: { accountId: 5, requestId } }))).rejects.toThrow('lock timeout');
  });
});
