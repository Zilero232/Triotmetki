import { beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { WebhookEndpoint } from '../../../../../generated';
import type { HostLookupService } from '../host-lookup.service';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { API_TIERS, WEBHOOK_EVENT_TO_DB } from '../../config';
import { ApiTierService } from '../api-tier.service';
import { WebhookEndpointsService } from '../webhook-endpoints.service';

const hosts = mock<HostLookupService>();

beforeEach(() => {
  hosts.resolve.mockReset();
  hosts.resolve.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
});

const endpoint = (overrides: Partial<WebhookEndpoint> = {}): WebhookEndpoint => ({
  id: '00000000-0000-4000-8000-000000000001',
  userId: 'user',
  url: 'https://hooks.example.com/otmetki',
  secret: 'whsec_c2VjcmV0',
  events: ['moeGained'],
  filter: { accountIds: [1] },
  isActive: true,
  failureCount: 0,
  disabledAt: null,
  createdAt: new Date('2026-09-26T12:00:00Z'),
  updatedAt: new Date('2026-09-26T12:00:00Z'),
  ...overrides
});

const createService = () => {
  const prisma = mockPrismaService();
  const tiers = mock<ApiTierService>();

  tiers.tierFor.mockResolvedValue('free');
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  return { service: new WebhookEndpointsService(prisma, tiers, hosts), prisma };
};

const input = { userId: 'user', url: 'https://hooks.example.com/otmetki', events: ['mark.gained' as const], filter: { accountIds: [1] } };

describe('WebhookEndpointsService.create', () => {
  it('stores the events under their database names and returns the secret once', async () => {
    const { service, prisma } = createService();

    prisma.webhookEndpoint.count.mockResolvedValue(0);
    prisma.webhookEndpoint.create.mockResolvedValue(endpoint());

    const created = await service.create(input);

    expect(prisma.webhookEndpoint.create.mock.calls[0]?.[0].data.events).toEqual([WEBHOOK_EVENT_TO_DB['mark.gained']]);
    expect(created.secret).toBe(prisma.webhookEndpoint.create.mock.calls[0]?.[0].data.secret);
    expect(created.endpoint.events).toEqual(['mark.gained']);
  });

  it('refuses an endpoint over the tier limit', async () => {
    const { service, prisma } = createService();

    prisma.webhookEndpoint.count.mockResolvedValue(API_TIERS.free.webhooks);

    await expect(service.create(input)).rejects.toMatchObject({
      response: { code: 'PLAN_LIMIT_REACHED', details: { limit: API_TIERS.free.webhooks } }
    });

    expect(prisma.webhookEndpoint.create).not.toHaveBeenCalled();
  });

  it('accepts the last endpoint within the tier limit', async () => {
    const { service, prisma } = createService();

    prisma.webhookEndpoint.count.mockResolvedValue(API_TIERS.free.webhooks - 1);
    prisma.webhookEndpoint.create.mockResolvedValue(endpoint());

    await expect(service.create(input)).resolves.toMatchObject({ endpoint: { url: input.url } });
  });

  it('refuses an address inside a private network', async () => {
    const { service, prisma } = createService();

    await expect(service.create({ ...input, url: 'https://192.168.1.1/hook' })).rejects.toMatchObject({ response: { code: 'VALIDATION_FAILED' } });
    expect(prisma.webhookEndpoint.create).not.toHaveBeenCalled();
  });

  it('refuses a public name that resolves into a private network', async () => {
    const { service, prisma } = createService();

    hosts.resolve.mockResolvedValue([{ address: '127.0.0.1', family: 4 }]);

    await expect(service.create(input)).rejects.toMatchObject({ response: { code: 'VALIDATION_FAILED' } });
    expect(prisma.webhookEndpoint.create).not.toHaveBeenCalled();
  });
});

describe('WebhookEndpointsService.update', () => {
  it('clears the failure streak when an endpoint is switched back on', async () => {
    const { service, prisma } = createService();

    prisma.webhookEndpoint.findFirst.mockResolvedValue(endpoint());
    prisma.webhookEndpoint.count.mockResolvedValue(0);
    prisma.webhookEndpoint.update.mockResolvedValue(endpoint());

    await service.update({ userId: 'user', id: 'id', isActive: true });

    expect(prisma.webhookEndpoint.update.mock.calls[0]?.[0].data).toMatchObject({ isActive: true, failureCount: 0, disabledAt: null });
  });

  it('keeps the failure streak of an endpoint switched off', async () => {
    const { service, prisma } = createService();

    prisma.webhookEndpoint.findFirst.mockResolvedValue(endpoint());
    prisma.webhookEndpoint.update.mockResolvedValue(endpoint({ isActive: false }));

    await service.update({ userId: 'user', id: 'id', isActive: false });

    expect(prisma.webhookEndpoint.update.mock.calls[0]?.[0].data).toEqual({ isActive: false });
  });

  it('changes only the fields that were sent, storing events under their database names', async () => {
    const { service, prisma } = createService();

    prisma.webhookEndpoint.findFirst.mockResolvedValue(endpoint());
    prisma.webhookEndpoint.update.mockResolvedValue(endpoint());

    await service.update({ userId: 'user', id: 'id', events: ['mark.gained'] });

    expect(prisma.webhookEndpoint.update.mock.calls[0]?.[0].data).toEqual({ events: [WEBHOOK_EVENT_TO_DB['mark.gained']] });
  });

  it('refuses to move an endpoint into a private network', async () => {
    const { service, prisma } = createService();

    prisma.webhookEndpoint.findFirst.mockResolvedValue(endpoint());

    await expect(service.update({ userId: 'user', id: 'id', url: 'https://10.0.0.1/hook' })).rejects.toMatchObject({
      response: { code: 'VALIDATION_FAILED' }
    });

    expect(prisma.webhookEndpoint.update).not.toHaveBeenCalled();
  });

  it('refuses to switch an endpoint back on over the tier limit', async () => {
    const { service, prisma } = createService();

    prisma.webhookEndpoint.findFirst.mockResolvedValue(endpoint());
    prisma.webhookEndpoint.count.mockResolvedValue(API_TIERS.free.webhooks);

    await expect(service.update({ userId: 'user', id: 'id', isActive: true })).rejects.toMatchObject({ response: { code: 'PLAN_LIMIT_REACHED' } });
    expect(prisma.webhookEndpoint.update).not.toHaveBeenCalled();
  });

  it('answers 404 for somebody else’s endpoint', async () => {
    const { service, prisma } = createService();

    prisma.webhookEndpoint.findFirst.mockResolvedValue(null);

    await expect(service.update({ userId: 'user', id: 'id', isActive: false })).rejects.toMatchObject({ response: { code: 'NOT_FOUND' } });
  });
});

describe('WebhookEndpointsService.enforceTier', () => {
  it('switches off the newest active endpoints over the tier limit and deletes nothing', async () => {
    const { service, prisma } = createService();
    const active = Array.from({ length: API_TIERS.free.webhooks + 1 }, (_, index) => endpoint({ id: `endpoint-${index}` }));
    const newest = active.at(-1)?.id;

    prisma.webhookEndpoint.findMany.mockResolvedValue(active);
    prisma.webhookEndpoint.updateMany.mockResolvedValue({ count: 1 });

    expect(await service.enforceTier({ userId: 'user', tier: 'free' })).toBe(1);
    expect(prisma.webhookEndpoint.updateMany.mock.calls[0]?.[0].where).toEqual({ id: { in: [newest] } });
    expect(prisma.webhookEndpoint.delete).not.toHaveBeenCalled();
  });

  it('changes nothing for a user within the tier limit', async () => {
    const { service, prisma } = createService();

    prisma.webhookEndpoint.findMany.mockResolvedValue(
      Array.from({ length: API_TIERS.free.webhooks }, (_, index) => endpoint({ id: `endpoint-${index}` }))
    );

    expect(await service.enforceTier({ userId: 'user', tier: 'free' })).toBe(0);
    expect(prisma.webhookEndpoint.updateMany).not.toHaveBeenCalled();
  });
});
