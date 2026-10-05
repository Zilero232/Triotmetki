import { Job } from 'bullmq';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../collector/metrics';
import type { CompetitionScoringAggregateService } from '../../services/competition-scoring-aggregate.service';

import { COMPETITION_QUEUE } from '../../config/competitions.constants';
import { CompetitionsProcessor } from '../competitions.processor';

const trackingMetrics = () => mock<MetricsService>({ track: async ({ run }) => run() });

describe('CompetitionsProcessor.process', () => {
  it('runs scoring for a score job and ignores unknown jobs', async () => {
    const scoring = mock<CompetitionScoringAggregateService>();
    const processor = new CompetitionsProcessor(scoring, trackingMetrics());

    scoring.run.mockResolvedValue(2);

    expect(await processor.process(mock<Job>({ name: COMPETITION_QUEUE.jobs.score }))).toBe(2);
    expect(await processor.process(mock<Job>({ name: 'unknown' }))).toBeNull();
    expect(scoring.run).toHaveBeenCalledTimes(1);
  });
});
