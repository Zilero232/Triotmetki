import type { Job } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../collector/metrics';
import type { PromoService } from '../../services/promo.service';
import type { RenewalService } from '../../services/renewal.service';

import { BILLING_QUEUE } from '../../config/queue.constants';
import { BillingProcessor } from '../billing.processor';

const trackingMetrics = () => mock<MetricsService>({ track: async ({ run }) => run() });

const createProcessor = () => {
  const renewals = mock<RenewalService>();
  const promos = mock<PromoService>();

  renewals.chargeDue.mockResolvedValue(3);
  renewals.expireDue.mockResolvedValue(5);
  promos.releaseExpired.mockResolvedValue(2);

  return { processor: new BillingProcessor(renewals, promos, trackingMetrics()), renewals, promos };
};

describe('BillingProcessor.process', () => {
  it('charges due renewals on a renew job', async () => {
    const { processor, renewals } = createProcessor();

    await expect(processor.process(mock<Job>({ name: BILLING_QUEUE.jobs.renew }))).resolves.toBe(3);
    expect(renewals.expireDue).not.toHaveBeenCalled();
  });

  it('expires lapsed subscriptions on an expire job', async () => {
    const { processor, renewals } = createProcessor();

    await expect(processor.process(mock<Job>({ name: BILLING_QUEUE.jobs.expire }))).resolves.toBe(7);
    expect(renewals.chargeDue).not.toHaveBeenCalled();
  });

  it('gives back the promo reservations of timed-out checkouts on an expire job', async () => {
    const { processor, promos } = createProcessor();

    await processor.process(mock<Job>({ name: BILLING_QUEUE.jobs.expire }));

    expect(promos.releaseExpired).toHaveBeenCalledOnce();
  });

  it('ignores a job it does not know', async () => {
    const { processor, renewals } = createProcessor();

    await expect(processor.process(mock<Job>({ name: 'unknown' }))).resolves.toBe(0);
    expect(renewals.chargeDue).not.toHaveBeenCalled();
    expect(renewals.expireDue).not.toHaveBeenCalled();
  });
});
