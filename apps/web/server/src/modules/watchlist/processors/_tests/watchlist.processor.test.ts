import { Job } from 'bullmq';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../collector/metrics';
import type { WatchlistDigestService } from '../../services/watchlist-digest.service';

import { WATCHLIST_QUEUE } from '../../config/queue.constants';
import { WatchlistProcessor } from '../watchlist.processor';

const trackingMetrics = () => mock<MetricsService>({ track: async ({ run }) => run() });

describe('WatchlistProcessor.process', () => {
  it('sends digests for a digest job and ignores unknown jobs', async () => {
    const digests = mock<WatchlistDigestService>();
    const processor = new WatchlistProcessor(digests, trackingMetrics());

    digests.run.mockResolvedValue(3);

    expect(await processor.process(mock<Job>({ name: WATCHLIST_QUEUE.jobs.digest }))).toBe(3);
    expect(await processor.process(mock<Job>({ name: 'unknown' }))).toBeNull();
    expect(digests.run).toHaveBeenCalledTimes(1);
  });
});
