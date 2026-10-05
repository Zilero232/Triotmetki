import { Job } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../collector/metrics';

import { PROGRESSION_QUEUE } from '../../config/queue.constants';
import { ProgressionAggregateService } from '../../services/progression-aggregate.service';
import { ProgressionProcessor } from '../progression.processor';

const trackingMetrics = () => mock<MetricsService>({ track: async ({ run }) => run() });

const now = new Date('2026-09-26T10:00:00Z');

const job = (name: string) => mock<Job>({ name });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ProgressionProcessor.process', () => {
  it('runs progression at the current time for the run job', async () => {
    const runs = mock<ProgressionAggregateService>();

    runs.run.mockResolvedValue(3);

    expect(await new ProgressionProcessor(runs, trackingMetrics()).process(job(PROGRESSION_QUEUE.jobs.run))).toBe(3);
    expect(runs.run).toHaveBeenCalledWith(now);
  });

  it('ignores unknown jobs', async () => {
    const runs = mock<ProgressionAggregateService>();

    expect(await new ProgressionProcessor(runs, trackingMetrics()).process(job('unknown'))).toBeNull();
    expect(runs.run).not.toHaveBeenCalled();
  });
});
