import RedisMock from 'ioredis-mock';
import { describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { NotificationService } from '../notification.service';

import { PLUS_LAUNCH } from '../../config/plus-launch.constants';
import { PlusLaunchService } from '../plus-launch.service';

const createService = (isCheckoutEnabled = true) => {
  const notifications = mock<NotificationService>();
  const redis = new RedisMock();

  notifications.broadcast.mockResolvedValue(3);

  return { service: new PlusLaunchService(notifications, redis, isCheckoutEnabled), notifications, redis };
};

describe('PlusLaunchService.announce', () => {
  it('stays silent while checkout is closed', async () => {
    const { service, notifications } = createService(false);

    await expect(service.announce()).resolves.toBe(0);
    expect(notifications.broadcast).not.toHaveBeenCalled();
  });

  it('notifies the opted-in users once after checkout opens', async () => {
    const { service, notifications } = createService();

    await expect(service.announce()).resolves.toBe(3);
    await expect(service.announce()).resolves.toBe(0);

    expect(notifications.broadcast).toHaveBeenCalledExactlyOnceWith({
      notification: { event: 'plusCheckoutOpen' },
      dedupeKey: PLUS_LAUNCH.dedupeKey
    });
  });

  it('releases the claim when the broadcast fails so the next boot retries', async () => {
    const { service, notifications, redis } = createService();

    notifications.broadcast.mockRejectedValueOnce(new Error('queue down'));

    await expect(service.announce()).rejects.toThrow('queue down');
    await expect(redis.exists(PLUS_LAUNCH.announcedKey)).resolves.toBe(0);
    await expect(service.announce()).resolves.toBe(3);
  });
});

describe('PlusLaunchService.onApplicationBootstrap', () => {
  it('lets the worker finish booting while the broadcast is still running', async () => {
    const { service, notifications } = createService();
    const { promise, resolve } = Promise.withResolvers<number>();

    notifications.broadcast.mockReturnValue(promise);

    expect(service.onApplicationBootstrap()).toBeUndefined();

    await vi.waitFor(() => expect(notifications.broadcast).toHaveBeenCalled());
    resolve(3);
  });
});
