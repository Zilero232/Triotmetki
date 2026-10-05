import type { Job } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MetricsService } from '../../../collector/metrics';
import type { DeliveryService } from '../../services/delivery.service';

import { NOTIFICATIONS_JOB } from '../../config/notifications-queue.constants';
import { DeliverProcessor } from '../deliver.processor';

const trackingMetrics = () => mock<MetricsService>({ track: async ({ run }) => run() });

const DIGEST = { userId: 'u', weekKey: '2026-W40', digest: { battles: 1, wins: 1, damageDealt: 1, sessions: 1, marksGained: 0 } };

const EVENT = {
  userId: 'u',
  dedupeKey: 'moe-1',
  notification: { event: 'moeGained', accountId: 1, nickname: 'Tanker', tankId: 1, tankName: 'IS-7', marks: 3 }
};

const jobOf = ({ name, data }: { name: string; data: unknown }): Job => Object.assign(mock<Job>({ name }), { data });

const createProcessor = () => {
  const delivery = mock<DeliveryService>();

  delivery.deliver.mockResolvedValue(1);
  delivery.deliverDigest.mockResolvedValue(1);

  return { processor: new DeliverProcessor(delivery, trackingMetrics()), delivery };
};

describe('DeliverProcessor.process', () => {
  it('delivers a digest job as a digest', async () => {
    const { processor, delivery } = createProcessor();

    await processor.process(jobOf({ name: NOTIFICATIONS_JOB.deliver.digest, data: DIGEST }));

    expect(delivery.deliverDigest).toHaveBeenCalledWith(DIGEST);
    expect(delivery.deliver).not.toHaveBeenCalled();
  });

  it('delivers any other job as an event with schema defaults applied', async () => {
    const { processor, delivery } = createProcessor();

    await processor.process(jobOf({ name: NOTIFICATIONS_JOB.deliver.event, data: EVENT }));

    expect(delivery.deliver.mock.calls[0]?.[0].notification).toMatchObject({ event: 'moeGained', isFollowed: false });
  });

  it('rejects a malformed payload instead of delivering it', async () => {
    const { processor, delivery } = createProcessor();

    await expect(processor.process(jobOf({ name: NOTIFICATIONS_JOB.deliver.event, data: { userId: '' } }))).rejects.toThrow();
    expect(delivery.deliver).not.toHaveBeenCalled();
  });
});
