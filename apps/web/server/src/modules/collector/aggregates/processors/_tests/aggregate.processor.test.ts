import type { Job } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../metrics';
import type { BuildUsageAggregateService, ModeMetaAggregateService } from '../../meta';
import type { AccountRatingsAggregateService } from '../../player-ratings';
import type { ServerStatsAggregateService, TrackingTierAggregateService } from '../../server';
import type { LearningCurveAggregateService, TankEconomyAggregateService, TankPercentilesAggregateService } from '../../tank-stats';

import { JOB } from '../../../contracts';
import { AggregateProcessor } from '../aggregate.processor';

const createProcessor = () => {
  const accountRatings = mock<AccountRatingsAggregateService>();
  const serverStats = mock<ServerStatsAggregateService>();
  const percentiles = mock<TankPercentilesAggregateService>();
  const trackingTiers = mock<TrackingTierAggregateService>();
  const economy = mock<TankEconomyAggregateService>();
  const learning = mock<LearningCurveAggregateService>();
  const buildUsage = mock<BuildUsageAggregateService>();
  const modeMeta = mock<ModeMetaAggregateService>();
  const metrics = mock<MetricsService>();

  metrics.track.mockImplementation(({ run }) => run());

  return {
    accountRatings,
    serverStats,
    economy,
    learning,
    metrics,
    processor: new AggregateProcessor(accountRatings, serverStats, percentiles, trackingTiers, economy, learning, buildUsage, modeMeta, metrics)
  };
};

describe('AggregateProcessor', () => {
  it('routes a job to the service named by the job and wraps it in metrics', async () => {
    const { serverStats, metrics, processor } = createProcessor();
    const job = mock<Job>({ name: JOB.aggregate.serverStats, data: {} });

    serverStats.compute.mockResolvedValue({ rows: 3 });

    expect(await processor.process(job)).toEqual({ rows: 3 });
    expect(metrics.track).toHaveBeenCalledOnce();
  });

  it('routes the nightly economy and learning-curve jobs to their services', async () => {
    const { economy, learning, processor } = createProcessor();

    economy.compute.mockResolvedValue({ rows: 5 });
    learning.compute.mockResolvedValue({ rows: 8 });

    expect(await processor.process(mock<Job>({ name: JOB.aggregate.tankEconomy, data: {} }))).toEqual({ rows: 5 });
    expect(await processor.process(mock<Job>({ name: JOB.aggregate.learningCurve, data: {} }))).toEqual({ rows: 8 });
  });

  it('validates the account ratings payload before computing', async () => {
    const { accountRatings, processor } = createProcessor();

    await expect(processor.process(mock<Job>({ name: JOB.aggregate.accountRatings, data: { accountId: -1 } }))).rejects.toThrow();
    expect(accountRatings.compute).not.toHaveBeenCalled();
  });

  it('ignores a job name it does not know', async () => {
    const { processor } = createProcessor();

    expect(await processor.process(mock<Job>({ name: 'unknown', data: {} }))).toEqual({ ignored: 'unknown' });
  });
});
