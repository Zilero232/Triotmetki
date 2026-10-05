import { Job } from 'bullmq';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../collector/metrics';
import type { SessionCloseService } from '../../services/session-close.service';
import type { WebhookDeliveryService } from '../../services/webhook-delivery.service';
import type { WebhookRedriveService } from '../../services/webhook-redrive.service';

import { JOB } from '../../../collector';
import { WebhooksProcessor } from '../webhooks.processor';

const DELIVERY_ID = '00000000-0000-4000-8000-000000000001';

const createProcessor = () => {
  const deliveries = mock<WebhookDeliveryService>();
  const sessions = mock<SessionCloseService>();
  const redrive = mock<WebhookRedriveService>();
  const metrics = mock<MetricsService>();

  metrics.track.mockImplementation(({ run }) => run());
  deliveries.deliver.mockResolvedValue('delivered');

  return { deliveries, sessions, redrive, metrics, processor: new WebhooksProcessor(deliveries, sessions, redrive, metrics) };
};

const deliverJob = ({ attemptsMade, attempts }: { attemptsMade: number; attempts?: number }) =>
  mock<Job>({ name: JOB.developerWebhooks.deliver, data: { deliveryId: DELIVERY_ID }, attemptsMade, opts: { attempts } });

describe('WebhooksProcessor', () => {
  it('closes idle sessions on the close-sessions job without delivering anything', async () => {
    const { processor, sessions, deliveries } = createProcessor();

    sessions.closeIdle.mockResolvedValue(3);

    expect(await processor.process(mock<Job>({ name: JOB.developerWebhooks.closeSessions, data: {} }))).toEqual({ closed: 3 });
    expect(deliveries.deliver).not.toHaveBeenCalled();
  });

  it('delivers with a one-based attempt number', async () => {
    const { processor, deliveries } = createProcessor();

    expect(await processor.process(deliverJob({ attemptsMade: 0, attempts: 3 }))).toEqual({ result: 'delivered' });
    expect(deliveries.deliver).toHaveBeenCalledWith({ deliveryId: DELIVERY_ID, attempt: 1, isFinal: false });
  });

  it('marks the last configured attempt as final', async () => {
    const { processor, deliveries } = createProcessor();

    await processor.process(deliverJob({ attemptsMade: 2, attempts: 3 }));

    expect(deliveries.deliver).toHaveBeenCalledWith(expect.objectContaining({ attempt: 3, isFinal: true }));
  });

  it('treats the first attempt as final when the job has no retries configured', async () => {
    const { processor, deliveries } = createProcessor();

    await processor.process(deliverJob({ attemptsMade: 0 }));

    expect(deliveries.deliver).toHaveBeenCalledWith(expect.objectContaining({ attempt: 1, isFinal: true }));
  });

  it('fails a delivery job whose payload is not a delivery id', async () => {
    const { processor, deliveries } = createProcessor();

    await expect(
      processor.process(mock<Job>({ name: JOB.developerWebhooks.deliver, data: { deliveryId: 'nope' }, attemptsMade: 0, opts: {} }))
    ).rejects.toThrow();

    expect(deliveries.deliver).not.toHaveBeenCalled();
  });

  it('runs every job through the metrics tracker', async () => {
    const { processor, metrics } = createProcessor();
    const job = deliverJob({ attemptsMade: 0, attempts: 3 });

    await processor.process(job);

    expect(metrics.track).toHaveBeenCalledWith(expect.objectContaining({ job }));
  });
});
