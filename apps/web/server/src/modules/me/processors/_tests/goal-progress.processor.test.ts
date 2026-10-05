import { Job } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../collector/metrics';

import { GOAL_PROGRESS_QUEUE } from '../../config/goal-progress.constants';
import { GoalProgressAggregateService } from '../../services/goal-progress-aggregate.service';
import { GoalProgressProcessor } from '../goal-progress.processor';

const trackingMetrics = () => mock<MetricsService>({ track: async ({ run }) => run() });

const now = new Date('2026-09-28T10:00:00Z');

const job = (name: string) => mock<Job>({ name });

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('GoalProgressProcessor.process', () => {
  it('recomputes goal progress at the current time', async () => {
    const progress = mock<GoalProgressAggregateService>();

    progress.run.mockResolvedValue(2);

    expect(await new GoalProgressProcessor(progress, trackingMetrics()).process(job(GOAL_PROGRESS_QUEUE.jobs.progress))).toBe(2);
    expect(progress.run).toHaveBeenCalledWith(now);
  });

  it('ignores unknown jobs', async () => {
    const progress = mock<GoalProgressAggregateService>();

    expect(await new GoalProgressProcessor(progress, trackingMetrics()).process(job('unknown'))).toBe(0);
    expect(progress.run).not.toHaveBeenCalled();
  });
});
