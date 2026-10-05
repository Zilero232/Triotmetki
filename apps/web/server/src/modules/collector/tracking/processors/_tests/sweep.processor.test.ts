import { DelayedError, Job } from 'bullmq';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CircuitBreakerService, MetricsService } from '../../../metrics';
import type { DispatchService } from '../../services/dispatch.service';
import type { PollSyncService } from '../../services/poll-sync.service';
import type { SeedService } from '../../services/seed.service';

import { JOB } from '../../../contracts';
import { SweepProcessor } from '../sweep.processor';

const createProcessor = (open: boolean) => {
  const pipeline = mock<PollSyncService>();
  const dispatch = mock<DispatchService>();
  const breaker = mock<CircuitBreakerService>();
  const metrics = mock<MetricsService>();

  breaker.isOpen.mockReturnValue(open);
  metrics.track.mockImplementation(({ run }) => run());

  return { pipeline, dispatch, processor: new SweepProcessor(pipeline, dispatch, mock<SeedService>(), breaker, metrics) };
};

describe('SweepProcessor', () => {
  it('delays a batch instead of calling Lesta while the circuit is open', async () => {
    const { pipeline, processor } = createProcessor(true);
    const job = mock<Job>({ name: JOB.sweep.batch, data: { accountIds: [1] } });

    await expect(processor.process(job, 'token')).rejects.toBeInstanceOf(DelayedError);
    expect(job.moveToDelayed).toHaveBeenCalled();
    expect(pipeline.run).not.toHaveBeenCalled();
  });

  it('still dispatches while the circuit is open, since dispatch never calls Lesta', async () => {
    const { dispatch, processor } = createProcessor(true);

    dispatch.dispatchSweep.mockResolvedValue(4);

    expect(await processor.process(mock<Job>({ name: JOB.sweep.dispatch, data: {} }))).toEqual({ dispatched: 4 });
  });

  it('polls a batch on the bulk lane as population', async () => {
    const { pipeline, processor } = createProcessor(false);

    await processor.process(mock<Job>({ name: JOB.sweep.batch, data: { accountIds: [1, 2] } }));

    expect(pipeline.run).toHaveBeenCalledWith({ accountIds: [1, 2], lane: 'bulk', tier: 'population' });
  });
});
