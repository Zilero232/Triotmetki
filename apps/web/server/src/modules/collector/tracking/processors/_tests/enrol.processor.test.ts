import { Job } from 'bullmq';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../metrics';
import type { EnrolService } from '../../services/enrol.service';

import { EnrolProcessor } from '../enrol.processor';

const createProcessor = () => {
  const enrolment = mock<EnrolService>();
  const metrics = mock<MetricsService>();

  metrics.track.mockImplementation(({ run }) => run());

  return { enrolment, processor: new EnrolProcessor(enrolment, metrics) };
};

describe('EnrolProcessor', () => {
  it('enrols the account from the job payload', async () => {
    const { enrolment, processor } = createProcessor();

    await processor.process(mock<Job>({ data: { accountId: 42, reason: 'view' } }));

    expect(enrolment.enrol).toHaveBeenCalledWith({ accountId: 42, reason: 'view' });
  });

  it('rejects a payload without an account id', async () => {
    const { enrolment, processor } = createProcessor();

    await expect(processor.process(mock<Job>({ data: { reason: 'view' } }))).rejects.toThrow();
    expect(enrolment.enrol).not.toHaveBeenCalled();
  });
});
