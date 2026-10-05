import { Job } from 'bullmq';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../metrics';
import type { CatalogSyncService } from '../../services/catalog-sync.service';
import type { EncyclopediaSyncService } from '../../services/encyclopedia-sync.service';
import type { ExpectedValuesSyncService } from '../../services/expected-values-sync.service';
import type { MasteryThresholdsSyncService } from '../../services/mastery-thresholds-sync.service';
import type { MoeEstimateAggregateService } from '../../services/moe-estimate-aggregate.service';
import type { MoeThresholdsSyncService } from '../../services/moe-thresholds-sync.service';

import { JOB } from '../../../contracts';
import { ReferenceProcessor } from '../reference.processor';

const createProcessor = () => {
  const encyclopedia = mock<EncyclopediaSyncService>();
  const expectedValues = mock<ExpectedValuesSyncService>();
  const moe = mock<MoeThresholdsSyncService>();
  const moeEstimate = mock<MoeEstimateAggregateService>();
  const mastery = mock<MasteryThresholdsSyncService>();
  const catalog = mock<CatalogSyncService>();
  const metrics = mock<MetricsService>();

  metrics.track.mockImplementation(({ run }) => run());

  return {
    encyclopedia,
    expectedValues,
    moe,
    moeEstimate,
    mastery,
    catalog,
    processor: new ReferenceProcessor(encyclopedia, expectedValues, moe, moeEstimate, mastery, catalog, metrics)
  };
};

describe('ReferenceProcessor', () => {
  it('routes each reference job to its sync', async () => {
    const { encyclopedia, expectedValues, moe, moeEstimate, mastery, catalog, processor } = createProcessor();

    await processor.process(mock<Job>({ name: JOB.reference.versionCheck, data: {} }));
    await processor.process(mock<Job>({ name: JOB.reference.wn8Expected, data: {} }));
    await processor.process(mock<Job>({ name: JOB.reference.moeThresholds, data: {} }));
    await processor.process(mock<Job>({ name: JOB.reference.moeEstimate, data: {} }));
    await processor.process(mock<Job>({ name: JOB.reference.masteryThresholds, data: {} }));
    await processor.process(mock<Job>({ name: JOB.reference.englishNames, data: {} }));

    expect(encyclopedia.checkVersion).toHaveBeenCalledOnce();
    expect(expectedValues.sync).toHaveBeenCalledOnce();
    expect(moe.sync).toHaveBeenCalledOnce();
    expect(moeEstimate.sync).toHaveBeenCalledOnce();
    expect(mastery.sync).toHaveBeenCalledOnce();
    expect(catalog.englishNames).toHaveBeenCalledOnce();
  });

  it('passes the force flag to the encyclopedia sync', async () => {
    const { encyclopedia, processor } = createProcessor();

    await processor.process(mock<Job>({ name: JOB.reference.encyclopedia, data: { force: true } }));

    expect(encyclopedia.sync).toHaveBeenCalledWith({ force: true });
  });

  it('ignores an unknown job instead of failing it', async () => {
    const { encyclopedia, processor } = createProcessor();

    expect(await processor.process(mock<Job>({ name: 'stale-job', data: {} }))).toEqual({ ignored: 'stale-job' });
    expect(encyclopedia.sync).not.toHaveBeenCalled();
  });
});
