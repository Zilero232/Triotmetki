import type { Redis } from 'ioredis';

import { usageLimit } from '@otmetki/schemas';
import { millisecondsInHour } from 'date-fns/constants';
import RedisMock from 'ioredis-mock';
import { range } from 'remeda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { UsageActor } from '../../usage.types';

import { AppForbiddenException } from '../../../../common/exceptions';
import { EntitlementsService } from '../../../billing';
import { USAGE_METER } from '../../config/usage-meter.constants';
import { UsageMeterService } from '../usage-meter.service';

const NOW = new Date('2026-09-10T12:00:00Z');
const NEXT_MONTH = new Date('2026-10-01T09:00:00Z');
const FREE_USER: UsageActor = { userId: 'user-free', deviceId: null, ipHash: 'ip-user' };
const PLUS_USER: UsageActor = { userId: 'user-plus', deviceId: null, ipHash: 'ip-user' };
const VISITOR: UsageActor = { userId: null, deviceId: 'device-1', ipHash: 'ip-visitor' };
const FREE_LIMIT = usageLimit({ meter: 'armor3d', audience: 'free' }) ?? 0;
const ANONYMOUS_LIMIT = usageLimit({ meter: 'armor3d', audience: 'anonymous' }) ?? 0;

const createService = (redis: Redis = new RedisMock()) => {
  const entitlements = mock<EntitlementsService>();

  entitlements.isPlus.mockImplementation(async (userId) => userId === PLUS_USER.userId);

  return new UsageMeterService(redis, entitlements);
};

const openTanks = async ({ service, actor, tanks }: { service: UsageMeterService; actor: UsageActor; tanks: number[] }) => {
  for (const tank of tanks) {
    await service.consume({ meter: 'armor3d', actor, subject: String(tank) });
  }
};

describe('UsageMeterService.consume', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lets a free user open the monthly number of tanks and refuses the next one', async () => {
    const service = createService();

    await openTanks({ service, actor: FREE_USER, tanks: range(0, FREE_LIMIT) });

    const error = await service.consume({ meter: 'armor3d', actor: FREE_USER, subject: 'one-more' }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(AppForbiddenException);
    expect(error).toMatchObject({ response: { code: 'SUBSCRIPTION_REQUIRED', details: { feature: 'armor3d', limit: FREE_LIMIT } } });
  });

  it('counts the same tank once within a day', async () => {
    const service = createService();

    await openTanks({ service, actor: FREE_USER, tanks: [1, 1, 1] });

    expect(await service.consume({ meter: 'armor3d', actor: FREE_USER, subject: '1' })).toMatchObject({ used: 1, remaining: FREE_LIMIT - 1 });
  });

  it('counts the same tank again after a day has passed', async () => {
    const service = createService();

    await openTanks({ service, actor: FREE_USER, tanks: [1] });
    vi.setSystemTime(NOW.getTime() + (USAGE_METER.dedupeSeconds / 3600 + 1) * millisecondsInHour);

    expect(await service.consume({ meter: 'armor3d', actor: FREE_USER, subject: '1' })).toMatchObject({ used: 2 });
  });

  it('still reopens a tank already counted this month after the allowance is used up', async () => {
    const service = createService();

    await openTanks({ service, actor: FREE_USER, tanks: range(0, FREE_LIMIT) });

    await expect(service.consume({ meter: 'armor3d', actor: FREE_USER, subject: '0' })).resolves.toMatchObject({ remaining: 0 });
  });

  it('does not spend the allowance on a refused open', async () => {
    const service = createService();

    await openTanks({ service, actor: FREE_USER, tanks: range(0, FREE_LIMIT) });
    await service.consume({ meter: 'armor3d', actor: FREE_USER, subject: 'refused' }).catch(() => null);

    expect((await service.usage(FREE_USER)).meters.find(({ meter }) => meter === 'armor3d')).toMatchObject({ used: FREE_LIMIT, remaining: 0 });
  });

  it('gives the full allowance back at the start of the next Moscow month', async () => {
    const service = createService();

    await openTanks({ service, actor: FREE_USER, tanks: range(0, FREE_LIMIT) });
    vi.setSystemTime(NEXT_MONTH);

    await expect(service.consume({ meter: 'armor3d', actor: FREE_USER, subject: 'new-month' })).resolves.toMatchObject({
      used: 1,
      remaining: FREE_LIMIT - 1
    });
  });

  it('never meters a Plus subscriber', async () => {
    const service = createService();

    await openTanks({ service, actor: PLUS_USER, tanks: range(0, FREE_LIMIT * 2) });

    await expect(service.consume({ meter: 'armor3d', actor: PLUS_USER, subject: 'any' })).resolves.toMatchObject({ limit: null, remaining: null });
  });

  it('gives an anonymous visitor the smaller allowance', async () => {
    const service = createService();

    await openTanks({ service, actor: VISITOR, tanks: range(0, ANONYMOUS_LIMIT) });

    await expect(service.consume({ meter: 'armor3d', actor: VISITOR, subject: 'one-more' })).rejects.toBeInstanceOf(AppForbiddenException);
  });

  it('stops a visitor who clears the device cookie on the same network', async () => {
    const service = createService();
    const devices = range(0, USAGE_METER.anonymousIpFactor);

    for (const device of devices) {
      await openTanks({ service, actor: { ...VISITOR, deviceId: `device-${device}` }, tanks: range(0, ANONYMOUS_LIMIT) });
    }

    await expect(service.consume({ meter: 'armor3d', actor: { ...VISITOR, deviceId: 'fresh' }, subject: 'x' })).rejects.toBeInstanceOf(
      AppForbiddenException
    );
  });

  it('refuses a meter that anonymous visitors do not get at all', async () => {
    await expect(createService().consume({ meter: 'battleAnalysis', actor: VISITOR, subject: 'battle' })).rejects.toBeInstanceOf(
      AppForbiddenException
    );
  });

  it('still refuses an open over the allowance when giving the count back fails', async () => {
    const redis = new RedisMock();
    const service = createService(redis);

    await openTanks({ service, actor: FREE_USER, tanks: range(0, FREE_LIMIT) });

    vi.spyOn(redis, 'multi')
      .mockImplementationOnce(() => redis.pipeline())
      .mockImplementationOnce(() => {
        const failing = redis.pipeline();

        vi.spyOn(failing, 'exec').mockRejectedValue(new Error('ECONNRESET'));

        return failing;
      });

    await expect(service.consume({ meter: 'armor3d', actor: FREE_USER, subject: 'one-more' })).rejects.toBeInstanceOf(AppForbiddenException);
  });

  it('lets the open through when the usage store is down', async () => {
    const redis = mock<Redis>();

    redis.set.mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(createService(redis).consume({ meter: 'armor3d', actor: FREE_USER, subject: '1' })).resolves.toMatchObject({ limit: FREE_LIMIT });
  });
});

describe('UsageMeterService.usage', () => {
  it('reports every meter with its audience and the next reset', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);

    const usage = await createService().usage(VISITOR);

    vi.useRealTimers();

    expect(usage.audience).toBe('anonymous');
    expect(new Date(usage.resetsAt).getTime()).toBeGreaterThan(NOW.getTime());
    expect(usage.meters.find(({ meter }) => meter === 'armor3d')).toMatchObject({ used: 0, remaining: ANONYMOUS_LIMIT });
  });

  it('reports every meter as unlimited for Plus', async () => {
    const usage = await createService().usage(PLUS_USER);

    expect(usage.meters.every(({ limit, remaining }) => limit === null && remaining === null)).toBe(true);
  });
});
