import type { Queue } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import { JOB } from '../../../contracts';
import { TRACKING } from '../../config/tracking.constants';
import { RatingsTriggerService } from '../ratings-trigger.service';

describe('RatingsTriggerService.request', () => {
  it('queues nothing for an empty batch', async () => {
    const queue = mock<Queue>();

    await new RatingsTriggerService(queue).request([]);

    expect(queue.addBulk).not.toHaveBeenCalled();
  });

  it('queues one debounced, deduplicated ratings job per account', async () => {
    const queue = mock<Queue>();

    await new RatingsTriggerService(queue).request([1, 2]);

    const [jobs = []] = queue.addBulk.mock.calls[0] ?? [];

    expect(jobs.map((job) => [job.name, job.data.accountId])).toEqual([
      [JOB.aggregate.accountRatings, 1],
      [JOB.aggregate.accountRatings, 2]
    ]);

    expect(jobs.every((job) => job.opts?.delay === TRACKING.ratingsDebounceMs)).toBe(true);
    expect(new Set(jobs.map((job) => job.opts?.deduplication?.id)).size).toBe(jobs.length);
  });
});
