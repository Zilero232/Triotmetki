import type { Job, JobState, Queue } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { WebhookDelivery } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { WebhookEmitterService } from '../webhook-emitter.service';

import { WEBHOOK_DELIVERY } from '../../config';
import { WebhookRedriveService } from '../webhook-redrive.service';

const createService = (state: 'unknown' | JobState | null) => {
  const prisma = mockDeep<PrismaService>();
  const emitter = mock<WebhookEmitterService>();
  const queue = mock<Queue>();
  const job = mock<Job>();

  prisma.webhookDelivery.findMany.mockResolvedValue([mock<WebhookDelivery>({ id: 'd1' })]);
  job.getState.mockResolvedValue(state ?? 'unknown');
  queue.getJob.mockResolvedValue(state === null ? undefined : job);

  return { service: new WebhookRedriveService(prisma, emitter, queue), prisma, emitter, job };
};

describe('WebhookRedriveService.redrive', () => {
  it('re-queues a pending delivery whose job is gone', async () => {
    const { service, emitter } = createService(null);

    expect(await service.redrive()).toBe(1);
    expect(emitter.enqueue).toHaveBeenCalledWith('d1');
  });

  it('replaces a finished job that left its delivery pending', async () => {
    const { service, emitter, job } = createService('failed');

    expect(await service.redrive()).toBe(1);
    expect(job.remove).toHaveBeenCalled();
    expect(emitter.enqueue).toHaveBeenCalledWith('d1');
  });

  it('leaves a delivery alone while its job is still waiting', async () => {
    const { service, emitter } = createService('delayed');

    expect(await service.redrive()).toBe(0);
    expect(emitter.enqueue).not.toHaveBeenCalled();
  });

  it('closes pending deliveries of switched-off endpoints as failed instead of keeping them forever', async () => {
    const { service, prisma } = createService(null);

    await service.redrive();

    expect(prisma.webhookDelivery.updateMany.mock.calls[0]?.[0]).toMatchObject({
      where: { status: 'pending', endpoint: { isActive: false } },
      data: { status: 'failed', responseBody: WEBHOOK_DELIVERY.inactiveEndpointResponse, nextAttemptAt: null }
    });
  });
});
