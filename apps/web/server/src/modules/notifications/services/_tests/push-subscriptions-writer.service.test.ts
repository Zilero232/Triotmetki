import { ConfigService } from '@nestjs/config';
import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { PushSubscription } from '../../../../../generated';
import type { Env } from '../../../../config';
import type { PrismaService } from '../../../../core';
import type { WebPushEnv } from '../../lib/web-push-config/web-push-config.types';

import { AppConfigService } from '../../../../config';
import { PushSubscriptionsWriterService } from '../push-subscriptions-writer.service';

const CONFIGURED: WebPushEnv = { VAPID_PUBLIC_KEY: 'BPublic', VAPID_PRIVATE_KEY: 'private', VAPID_SUBJECT: 'mailto:ops@example.com' };
const UNCONFIGURED: WebPushEnv = { VAPID_PUBLIC_KEY: '', VAPID_PRIVATE_KEY: '', VAPID_SUBJECT: '' };
const SUBSCRIPTION = { userId: 'b', endpoint: 'https://push.example/1', keys: { p256dh: 'k', auth: 'a' }, userAgent: null };

const stored = (overrides: Partial<PushSubscription>): PushSubscription => ({
  id: 's1',
  userId: 'a',
  endpoint: 'https://push.example/1',
  p256dh: 'k',
  auth: 'a',
  userAgent: null,
  createdAt: new Date('2026-09-01T00:00:00Z'),
  ...overrides
});

const createService = (env: WebPushEnv = CONFIGURED) => {
  const prisma = mockDeep<PrismaService>();
  const config = new AppConfigService(new ConfigService<Env, true>(env));

  return { service: new PushSubscriptionsWriterService(prisma, config), prisma };
};

describe('PushSubscriptionsWriterService', () => {
  it('exposes a null public key when web push is not configured', () => {
    expect(createService(UNCONFIGURED).service.publicKey()).toEqual({ publicKey: null });
    expect(createService().service.publicKey()).toEqual({ publicKey: CONFIGURED.VAPID_PUBLIC_KEY });
  });

  it('hides the public key while the private key is missing, since nothing could be sent', () => {
    expect(createService({ ...CONFIGURED, VAPID_PRIVATE_KEY: '' }).service.publicKey()).toEqual({ publicKey: null });
  });

  it('refuses a subscription with an integration-unavailable error when web push is not configured', async () => {
    const { service, prisma } = createService(UNCONFIGURED);

    await expect(service.subscribe(SUBSCRIPTION)).rejects.toMatchObject({
      status: 404,
      response: { code: 'INTEGRATION_UNAVAILABLE' }
    });

    expect(prisma.pushSubscription.create).not.toHaveBeenCalled();
  });

  it('stores a new endpoint for the subscribing user', async () => {
    const { service, prisma } = createService();

    prisma.pushSubscription.findUnique.mockResolvedValue(null);

    await service.subscribe(SUBSCRIPTION);

    expect(prisma.pushSubscription.create).toHaveBeenCalledWith({
      data: { userId: 'b', endpoint: 'https://push.example/1', p256dh: 'k', auth: 'a', userAgent: null }
    });
  });

  it('moves an endpoint to another user only when the browser proves it holds the same subscription keys', async () => {
    const { service, prisma } = createService();

    prisma.pushSubscription.findUnique.mockResolvedValue(stored({ userId: 'a', p256dh: 'k', auth: 'a' }));

    await service.subscribe(SUBSCRIPTION);

    expect(prisma.pushSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { endpoint: 'https://push.example/1' }, data: expect.objectContaining({ userId: 'b' }) })
    );
  });

  it('refuses to take over an endpoint of another user with different subscription keys', async () => {
    const { service, prisma } = createService();

    prisma.pushSubscription.findUnique.mockResolvedValue(stored({ userId: 'a', p256dh: 'other', auth: 'other' }));

    await expect(service.subscribe(SUBSCRIPTION)).rejects.toMatchObject({ status: 409, response: { code: 'CONFLICT' } });
    expect(prisma.pushSubscription.update).not.toHaveBeenCalled();
  });

  it('lets the owner refresh the keys of their own endpoint', async () => {
    const { service, prisma } = createService();

    prisma.pushSubscription.findUnique.mockResolvedValue(stored({ userId: 'b', p256dh: 'old', auth: 'old' }));

    await service.subscribe(SUBSCRIPTION);

    expect(prisma.pushSubscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ p256dh: 'k', auth: 'a' }) })
    );
  });

  it('only removes the endpoint of the requesting user', async () => {
    const { service, prisma } = createService();

    await service.unsubscribe({ userId: 'a', endpoint: 'https://push.example/1' });

    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'a', endpoint: 'https://push.example/1' } })
    );
  });
});
