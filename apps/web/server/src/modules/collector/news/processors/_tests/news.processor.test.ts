import { Job } from 'bullmq';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../metrics';
import type { NewsSyncService } from '../../services/news-sync.service';

import { NewsProcessor } from '../news.processor';

describe('NewsProcessor', () => {
  it('syncs the feed inside the metrics tracker and returns its result', async () => {
    const news = mock<NewsSyncService>();
    const metrics = mock<MetricsService>();
    const job = mock<Job>({ name: 'sync' });

    metrics.track.mockImplementation(({ run }) => run());
    news.sync.mockResolvedValue({ items: 3, inserted: 1 });

    expect(await new NewsProcessor(news, metrics).process(job)).toEqual({ items: 3, inserted: 1 });
    expect(metrics.track).toHaveBeenCalledWith(expect.objectContaining({ job }));
  });
});
