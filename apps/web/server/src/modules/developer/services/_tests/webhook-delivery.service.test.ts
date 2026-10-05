import { WEBHOOK } from '@otmetki/schemas';
import { addMilliseconds } from 'date-fns';
import { Webhook } from 'standardwebhooks';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { WebhookDelivery, WebhookEndpoint } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { HostLookupService } from '../host-lookup.service';
import type { WebhookPosterService } from '../webhook-poster.service';

import { WEBHOOK_DELIVERY } from '../../config';
import { generateWebhookSecret, WebhookResponseError } from '../../lib';
import { WebhookDeliveryService } from '../webhook-delivery.service';

const poster = mock<WebhookPosterService>();

const hosts = mock<HostLookupService>();

const NOW = new Date('2026-09-26T12:00:00Z');

const PUBLIC_ADDRESS = [{ address: '93.184.216.34', family: 4 }];

const endpoint: WebhookEndpoint = {
  id: 'endpoint',
  userId: 'user',
  url: 'https://hooks.example.com/otmetki',
  secret: generateWebhookSecret(),
  events: ['moeGained'],
  filter: { accountIds: [1] },
  isActive: true,
  failureCount: 0,
  disabledAt: null,
  createdAt: NOW,
  updatedAt: NOW
};

const delivery: WebhookDelivery & { endpoint: WebhookEndpoint } = {
  id: 'delivery',
  endpointId: endpoint.id,
  event: 'moeGained',
  payload: { id: 'delivery', event: 'mark.gained' },
  status: 'pending',
  attempt: 0,
  responseStatus: null,
  responseBody: null,
  nextAttemptAt: null,
  deliveredAt: null,
  createdAt: NOW,
  endpoint
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.webhookDelivery.findUnique.mockResolvedValue(delivery);

  return { service: new WebhookDeliveryService(prisma, hosts, poster), prisma };
};

describe('WebhookDeliveryService.deliver', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    poster.post.mockReset();
    hosts.resolve.mockReset();
    hosts.resolve.mockResolvedValue(PUBLIC_ADDRESS);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('signs the body and records the success', async () => {
    const { service, prisma } = createService();

    poster.post.mockResolvedValue({ status: 200, body: 'ok' });

    await expect(service.deliver({ deliveryId: 'delivery', attempt: 1, isFinal: false })).resolves.toBe('delivered');

    const [options] = poster.post.mock.calls[0] ?? [];

    expect(options?.address).toBe(PUBLIC_ADDRESS[0]?.address);
    expect(options?.headers).toMatchObject({ [WEBHOOK.eventHeader]: 'mark.gained' });
    expect(new Webhook(endpoint.secret).verify(JSON.stringify(delivery.payload), options?.headers ?? {})).toEqual(delivery.payload);

    expect(prisma.webhookDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'succeeded', responseStatus: 200, deliveredAt: NOW, nextAttemptAt: null }) })
    );

    expect(prisma.webhookEndpoint.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: endpoint.id }, data: { failureCount: 0 } }));
  });

  it.each([
    ['a delivery that no longer exists', null],
    ['a delivery that already succeeded', { ...delivery, status: 'succeeded' as const }],
    ['a delivery of an event the API no longer publishes', { ...delivery, event: 'moeThresholdDropped' as const }]
  ])('skips %s', async (_, row) => {
    const { service, prisma } = createService();

    prisma.webhookDelivery.findUnique.mockResolvedValue(row);

    await expect(service.deliver({ deliveryId: 'delivery', attempt: 1, isFinal: false })).resolves.toBe('skipped');
    expect(poster.post).not.toHaveBeenCalled();
  });

  it('closes a pending delivery of a retired event so the redrive stops requeueing it', async () => {
    const { service, prisma } = createService();

    prisma.webhookDelivery.findUnique.mockResolvedValue({ ...delivery, event: 'moeThresholdDropped' });

    await service.deliver({ deliveryId: 'delivery', attempt: 1, isFinal: false });

    expect(prisma.webhookDelivery.update).toHaveBeenCalledWith({
      where: { id: 'delivery' },
      data: { status: 'failed', responseBody: WEBHOOK_DELIVERY.retiredEventResponse }
    });
  });

  it('fails a delivery for good when the host now resolves to a private address', async () => {
    const { service, prisma } = createService();

    hosts.resolve.mockResolvedValue([{ address: '10.0.0.5', family: 4 }]);
    prisma.webhookEndpoint.update.mockResolvedValue({ ...endpoint, failureCount: 1 });

    await expect(service.deliver({ deliveryId: 'delivery', attempt: 1, isFinal: false })).resolves.toBe('skipped');
    expect(poster.post).not.toHaveBeenCalled();

    expect(prisma.webhookDelivery.update.mock.calls[0]?.[0].data).toMatchObject({
      status: 'failed',
      responseBody: WEBHOOK_DELIVERY.blockedResponse
    });
  });

  it('closes a delivery to a switched-off endpoint as failed so retention can drop it', async () => {
    const { service, prisma } = createService();

    const disabled: WebhookDelivery & { endpoint: WebhookEndpoint } = { ...delivery, endpoint: { ...endpoint, isActive: false } };

    prisma.webhookDelivery.findUnique.mockResolvedValue(disabled);

    await expect(service.deliver({ deliveryId: 'delivery', attempt: 1, isFinal: false })).resolves.toBe('skipped');
    expect(poster.post).not.toHaveBeenCalled();

    expect(prisma.webhookDelivery.update.mock.calls[0]?.[0]).toMatchObject({
      where: { id: 'delivery' },
      data: { status: 'failed', responseBody: WEBHOOK_DELIVERY.inactiveEndpointResponse }
    });
  });

  it('keeps a failed attempt pending with the error as the response and rethrows so the queue retries it', async () => {
    const { service, prisma } = createService();

    poster.post.mockRejectedValue(new Error('timeout'));

    await expect(service.deliver({ deliveryId: 'delivery', attempt: 1, isFinal: false })).rejects.toThrow('timeout');

    expect(prisma.webhookDelivery.update.mock.calls[0]?.[0].data).toMatchObject({
      status: 'pending',
      attempt: 1,
      responseStatus: null,
      responseBody: 'timeout'
    });

    expect(prisma.webhookEndpoint.update).not.toHaveBeenCalled();
  });

  it.each([
    [1, 1],
    [2, 2],
    [3, 4]
  ])('schedules attempt %i to retry after %i× the base backoff', async (attempt, multiple) => {
    const { service, prisma } = createService();

    poster.post.mockRejectedValue(new Error('timeout'));

    await expect(service.deliver({ deliveryId: 'delivery', attempt, isFinal: false })).rejects.toThrow();

    expect(prisma.webhookDelivery.update.mock.calls[0]?.[0].data).toMatchObject({
      nextAttemptAt: addMilliseconds(NOW, WEBHOOK_DELIVERY.backoffMs * multiple)
    });
  });

  it('stores the status and a truncated body of an error response', async () => {
    const { service, prisma } = createService();

    poster.post.mockRejectedValue(new WebhookResponseError({ status: 502, body: 'x'.repeat(WEBHOOK_DELIVERY.responseBodyMaxLength + 1) }));

    await expect(service.deliver({ deliveryId: 'delivery', attempt: 1, isFinal: false })).rejects.toThrow();

    const data = prisma.webhookDelivery.update.mock.calls[0]?.[0].data;

    expect(data).toMatchObject({ responseStatus: 502 });
    expect(data?.responseBody).toHaveLength(WEBHOOK_DELIVERY.responseBodyMaxLength);
  });

  it('keeps the endpoint on one failure short of the limit', async () => {
    const { service, prisma } = createService();

    poster.post.mockRejectedValue(new Error('timeout'));
    prisma.webhookEndpoint.update.mockResolvedValue({ ...endpoint, failureCount: WEBHOOK_DELIVERY.disableAfterFailures - 1 });

    await expect(service.deliver({ deliveryId: 'delivery', attempt: WEBHOOK_DELIVERY.maxAttempts, isFinal: true })).rejects.toThrow();
    expect(prisma.webhookEndpoint.update).toHaveBeenCalledTimes(1);
    expect(prisma.webhookEndpoint.update).toHaveBeenCalledWith(expect.objectContaining({ data: { failureCount: { increment: 1 } } }));
  });

  it('switches the endpoint off after too many failed deliveries', async () => {
    const { service, prisma } = createService();

    poster.post.mockRejectedValue(new Error('timeout'));
    prisma.webhookEndpoint.update.mockResolvedValue({ ...endpoint, failureCount: WEBHOOK_DELIVERY.disableAfterFailures });

    await expect(service.deliver({ deliveryId: 'delivery', attempt: WEBHOOK_DELIVERY.maxAttempts, isFinal: true })).rejects.toThrow();
    expect(prisma.webhookDelivery.update.mock.calls[0]?.[0].data).toMatchObject({ status: 'failed', nextAttemptAt: null });
    expect(prisma.webhookEndpoint.update).toHaveBeenLastCalledWith({ where: { id: endpoint.id }, data: { isActive: false, disabledAt: NOW } });
  });
});
