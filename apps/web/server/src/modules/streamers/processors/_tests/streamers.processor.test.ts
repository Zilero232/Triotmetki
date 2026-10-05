import type { Job } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../collector/metrics';
import type { ChallengeFeedService } from '../../challenges';
import type { LiveStatusService } from '../../live';
import type { TwitchPredictionsService } from '../../predictions';
import type { SettingsAggregateService } from '../../settings';

import { STREAMERS_QUEUE } from '../../config/queue.constants';
import { StreamersProcessor } from '../streamers.processor';

const trackingMetrics = () => mock<MetricsService>({ track: async ({ run }) => run() });

const createProcessor = () => {
  const feed = mock<ChallengeFeedService>();
  const live = mock<LiveStatusService>();
  const aggregates = mock<SettingsAggregateService>();
  const predictions = mock<TwitchPredictionsService>();

  feed.run.mockResolvedValue(1);
  feed.expire.mockResolvedValue(2);
  live.poll.mockResolvedValue(3);
  aggregates.compute.mockResolvedValue(4);
  predictions.settleAll.mockResolvedValue(0);
  predictions.openFromJob.mockResolvedValue(1);

  return { processor: new StreamersProcessor(feed, live, aggregates, predictions, trackingMetrics()), feed, live, aggregates, predictions };
};

const job = (name: string, data: object = {}) => mock<Job>({ name, data });

describe('StreamersProcessor', () => {
  it('routes every scheduled job to its service and returns its count', async () => {
    const { processor, feed, live, aggregates } = createProcessor();

    expect(await processor.process(job(STREAMERS_QUEUE.jobs.battleFeed))).toBe(1);
    expect(await processor.process(job(STREAMERS_QUEUE.jobs.expireChallenges))).toBe(2);
    expect(await processor.process(job(STREAMERS_QUEUE.jobs.livePoll))).toBe(3);
    expect(await processor.process(job(STREAMERS_QUEUE.jobs.settingsAggregate))).toBe(4);
    expect([feed.run, feed.expire, live.poll, aggregates.compute].map((method) => method.mock.calls.length)).toEqual([1, 1, 1, 1]);
  });

  it('settles open predictions with the battle feed and opens one from a battle start', async () => {
    const { processor, predictions } = createProcessor();

    await processor.process(job(STREAMERS_QUEUE.jobs.battleFeed));
    expect(predictions.settleAll).toHaveBeenCalledTimes(1);

    const data = { accountId: '42', tankId: 1, occurredAt: '2026-09-26T12:00:00.000Z' };

    expect(await processor.process(job(STREAMERS_QUEUE.jobs.predictionOpen, data))).toBe(1);
    expect(predictions.openFromJob).toHaveBeenCalledWith(data);
  });

  it('ignores a job it does not know', async () => {
    const { processor, feed, live, aggregates } = createProcessor();

    expect(await processor.process(job('unknown'))).toBe(0);
    expect([feed.run, feed.expire, live.poll, aggregates.compute].some((method) => method.mock.calls.length > 0)).toBe(false);
  });
});
