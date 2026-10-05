import type { MessageEvent } from '@nestjs/common';
import type { Subscription } from 'rxjs';

import RedisMock from 'ioredis-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Overlay } from '../../../../../../generated';
import type { OverlayData } from '../../overlays.types';
import type { OverlayDataService } from '../overlay-data.service';

import { OVERLAY } from '../../config/overlay.constants';
import { OverlayPublisherService } from '../overlay-publisher.service';
import { OverlayStreamService } from '../overlay-stream.service';

const ACCOUNT = 1001n;

const settle = async () => {
  for (let round = 0; round < 10; round += 1) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

const createService = (accountId: bigint | null = ACCOUNT) => {
  const redis = new RedisMock();
  const data = mock<OverlayDataService>();
  const publisher = new OverlayPublisherService(redis);
  const overlay = mock<Overlay>({ id: 'o1', publicKey: 'key' });
  let computed = 0;

  data.find.mockResolvedValue(overlay);
  data.accountOf.mockResolvedValue(accountId);

  data.compute.mockImplementation(async () => {
    computed += 1;

    return mock<OverlayData>({ name: `payload-${computed}` });
  });

  const service = new OverlayStreamService(redis, data, publisher);
  const watch = () => {
    const events: MessageEvent[] = [];
    const subscription: Subscription = service.stream('key').subscribe((event) => events.push(event));

    return { events, subscription };
  };

  return { service, redis, data, publisher, watch, computed: () => computed };
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('OverlayStreamService.stream', () => {
  it('sends the overlay payload as soon as a viewer connects', async () => {
    const { watch, data } = createService();
    const { events, subscription } = watch();

    await settle();

    expect(data.find).toHaveBeenCalledWith('key');
    expect(events).toHaveLength(1);
    expect(events[0]?.data).toMatchObject({ name: 'payload-1' });

    subscription.unsubscribe();
  });

  it('recomputes the payload when the overlay account publishes a change', async () => {
    const { watch, publisher, computed } = createService();
    const { events, subscription } = watch();

    await settle();
    await publisher.publish(ACCOUNT);
    await settle();

    expect(computed()).toBe(2);
    expect(events).toHaveLength(2);

    subscription.unsubscribe();
  });

  it('ignores changes published for another account', async () => {
    const { watch, publisher, computed } = createService();
    const { subscription } = watch();

    await settle();
    await publisher.publish(ACCOUNT + 1n);
    await settle();

    expect(computed()).toBe(1);

    subscription.unsubscribe();
  });

  it('refreshes the payload on the stream interval', async () => {
    const { watch, computed } = createService();
    const { subscription } = watch();

    await settle();
    vi.advanceTimersByTime(OVERLAY.streamRefreshMs * 2);
    await settle();

    expect(computed()).toBe(3);

    subscription.unsubscribe();
  });

  it('still refreshes an overlay that has no account to listen to', async () => {
    const { watch, computed } = createService(null);
    const { subscription } = watch();

    await settle();
    vi.advanceTimersByTime(OVERLAY.streamRefreshMs);
    await settle();

    expect(computed()).toBe(2);

    subscription.unsubscribe();
  });

  it('keeps notifying the remaining viewer after another one leaves', async () => {
    const { watch, publisher } = createService();
    const first = watch();
    const second = watch();

    await settle();
    first.subscription.unsubscribe();
    await publisher.publish(ACCOUNT);
    await settle();

    expect(first.events).toHaveLength(1);
    expect(second.events).toHaveLength(2);

    second.subscription.unsubscribe();
  });

  it('listens again after every viewer left and a new one connects', async () => {
    const { watch, publisher } = createService();

    const first = watch();

    await settle();
    first.subscription.unsubscribe();
    await settle();

    const second = watch();

    await settle();
    await publisher.publish(ACCOUNT);
    await settle();

    expect(second.events).toHaveLength(2);

    second.subscription.unsubscribe();
  });
});

describe('OverlayStreamService.onModuleDestroy', () => {
  it('shuts down cleanly when no viewer ever connected', async () => {
    const { service } = createService();

    await expect(service.onModuleDestroy()).resolves.toBeUndefined();
  });

  it('closes the listening connection on shutdown', async () => {
    const { service, redis, watch } = createService();
    const subscriber = redis.duplicate();
    const quit = vi.spyOn(subscriber, 'quit');

    vi.spyOn(redis, 'duplicate').mockReturnValue(subscriber);

    const { subscription } = watch();

    await settle();
    subscription.unsubscribe();
    await service.onModuleDestroy();

    expect(quit).toHaveBeenCalledTimes(1);
  });
});
