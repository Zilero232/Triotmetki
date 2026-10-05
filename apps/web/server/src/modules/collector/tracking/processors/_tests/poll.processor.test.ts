import { Job } from 'bullmq';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../metrics';
import type { DispatchService } from '../../services/dispatch.service';
import type { PollSyncService } from '../../services/poll-sync.service';

import { JOB } from '../../../contracts';
import { PollProcessor } from '../poll.processor';

const createProcessor = () => {
  const pipeline = mock<PollSyncService>();
  const dispatch = mock<DispatchService>();
  const metrics = mock<MetricsService>();

  metrics.track.mockImplementation(({ run }) => run());

  return { pipeline, dispatch, metrics, processor: new PollProcessor(pipeline, dispatch, metrics) };
};

describe('PollProcessor', () => {
  it('dispatches due active players without polling', async () => {
    const { pipeline, dispatch, processor } = createProcessor();

    dispatch.dispatchActive.mockResolvedValue(3);

    expect(await processor.process(mock<Job>({ name: JOB.poll.dispatch, data: {} }))).toEqual({ dispatched: 3 });
    expect(pipeline.run).not.toHaveBeenCalled();
  });

  it('polls a batch on the priority lane as active', async () => {
    const { pipeline, processor } = createProcessor();

    await processor.process(mock<Job>({ name: JOB.poll.batch, data: { accountIds: [1, 2] } }));

    expect(pipeline.run).toHaveBeenCalledWith({ accountIds: [1, 2], lane: 'priority', tier: 'active' });
  });

  it('rejects a batch with a malformed payload before calling Lesta', async () => {
    const { pipeline, processor } = createProcessor();

    await expect(processor.process(mock<Job>({ name: JOB.poll.batch, data: { accountIds: 'x' } }))).rejects.toThrow();
    expect(pipeline.run).not.toHaveBeenCalled();
  });

  it('runs every job through the metrics tracker', async () => {
    const { metrics, processor } = createProcessor();
    const job = mock<Job>({ name: JOB.poll.dispatch, data: {} });

    await processor.process(job);

    expect(metrics.track).toHaveBeenCalledWith(expect.objectContaining({ job }));
  });
});
