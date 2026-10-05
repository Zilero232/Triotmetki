import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { ApiErrorLog } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { API_USAGE } from '../../config/public-api.constants';
import { ApiUsageWriterService } from '../api-usage-writer.service';

const BEFORE_MIDNIGHT = new Date('2026-09-26T23:59:59.500Z');

const AFTER_MIDNIGHT = new Date('2026-09-27T00:00:00.500Z');

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  return { service: new ApiUsageWriterService(prisma), prisma };
};

describe('ApiUsageWriterService.flush', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(BEFORE_MIDNIGHT);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes one row per key, day and endpoint however many requests there were', async () => {
    const { service, prisma } = createService();

    service.record({ keyId: 'key', endpoint: 'GET /v1/tanks', latencyMs: 10, failed: false });
    service.record({ keyId: 'key', endpoint: 'GET /v1/tanks', latencyMs: 30, failed: true });
    service.recordThrottled({ keyId: 'key', endpoint: 'GET /v1/tanks' });

    await service.flush();

    expect(prisma.apiUsageDaily.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.apiUsageDaily.upsert.mock.calls[0]?.[0].create).toMatchObject({ requests: 2, errors: 1, throttled: 1, latencyMsTotal: 40n });
  });

  it('writes nothing twice', async () => {
    const { service, prisma } = createService();

    service.record({ keyId: 'key', endpoint: 'GET /v1/tanks', latencyMs: 1, failed: false });

    await service.flush();
    await service.flush();

    expect(prisma.apiUsageDaily.upsert).toHaveBeenCalledTimes(1);
  });

  it('keeps going when the database is down', async () => {
    const { service, prisma } = createService();

    prisma.apiUsageDaily.upsert.mockRejectedValue(new Error('down'));
    service.record({ keyId: 'key', endpoint: 'GET /v1/tanks', latencyMs: 1, failed: false });

    await expect(service.flush()).resolves.toBeUndefined();
  });

  it('writes the rest of the buffer past a failed row and retries the failed one on the next flush', async () => {
    const { service, prisma } = createService();

    prisma.apiUsageDaily.upsert.mockRejectedValueOnce(new Error('down'));
    service.record({ keyId: 'a', endpoint: 'GET /v1/tanks', latencyMs: 1, failed: false });
    service.record({ keyId: 'b', endpoint: 'GET /v1/tanks', latencyMs: 1, failed: false });

    await service.flush();
    service.record({ keyId: 'a', endpoint: 'GET /v1/tanks', latencyMs: 1, failed: false });
    await service.flush();

    const writes = prisma.apiUsageDaily.upsert.mock.calls.map(([args]) => [args.create.apiKeyId, args.create.requests]);

    expect(writes).toEqual([
      ['a', 1],
      ['b', 1],
      ['a', 2]
    ]);
  });

  it('starts a new row at UTC midnight', async () => {
    const { service, prisma } = createService();

    service.record({ keyId: 'key', endpoint: 'GET /v1/tanks', latencyMs: 1, failed: false });
    vi.setSystemTime(AFTER_MIDNIGHT);
    service.record({ keyId: 'key', endpoint: 'GET /v1/tanks', latencyMs: 1, failed: false });

    await service.flush();

    expect(prisma.apiUsageDaily.upsert.mock.calls.map(([args]) => args.create.day)).toEqual([
      new Date('2026-09-26T00:00:00Z'),
      new Date('2026-09-27T00:00:00Z')
    ]);
  });

  it('rounds latency and never counts a negative one', async () => {
    const { service, prisma } = createService();

    service.record({ keyId: 'key', endpoint: 'GET /v1/tanks', latencyMs: 2.6, failed: false });
    service.record({ keyId: 'key', endpoint: 'GET /v1/tanks', latencyMs: -5, failed: false });

    await service.flush();

    expect(prisma.apiUsageDaily.upsert.mock.calls[0]?.[0].create.latencyMsTotal).toBe(3n);
  });
});

describe('ApiUsageWriterService.logError', () => {
  it('truncates a long message to the stored length', () => {
    const { service, prisma } = createService();

    prisma.apiErrorLog.create.mockResolvedValue(mock<ApiErrorLog>());

    service.logError({
      keyId: 'key',
      method: 'GET',
      path: '/v1/tanks',
      status: 500,
      code: 'INTERNAL',
      message: 'x'.repeat(API_USAGE.errorMessageMaxLength + 1)
    });

    expect(prisma.apiErrorLog.create.mock.calls[0]?.[0].data.message).toHaveLength(API_USAGE.errorMessageMaxLength);
  });

  it('stores null when the error has no message', () => {
    const { service, prisma } = createService();

    prisma.apiErrorLog.create.mockResolvedValue(mock<ApiErrorLog>());

    service.logError({ keyId: 'key', method: 'GET', path: '/v1/tanks', status: 404, code: 'NOT_FOUND', message: null });

    expect(prisma.apiErrorLog.create.mock.calls[0]?.[0].data.message).toBeNull();
  });
});

describe('ApiUsageWriterService lifecycle', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('flushes the buffer on every interval once started', async () => {
    vi.useFakeTimers({ now: BEFORE_MIDNIGHT });

    const { service, prisma } = createService();

    service.onModuleInit();
    service.record({ keyId: 'key', endpoint: 'GET /v1/tanks', latencyMs: 1, failed: false });

    await vi.advanceTimersByTimeAsync(API_USAGE.flushIntervalMs - 1);

    expect(prisma.apiUsageDaily.upsert).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);

    expect(prisma.apiUsageDaily.upsert).toHaveBeenCalledOnce();

    await service.onModuleDestroy();
  });

  it('writes what is left and stops the interval on shutdown', async () => {
    vi.useFakeTimers({ now: BEFORE_MIDNIGHT });

    const { service, prisma } = createService();

    service.onModuleInit();
    service.record({ keyId: 'key', endpoint: 'GET /v1/tanks', latencyMs: 1, failed: false });
    await service.onModuleDestroy();

    expect(prisma.apiUsageDaily.upsert).toHaveBeenCalledOnce();

    service.record({ keyId: 'key', endpoint: 'GET /v1/tanks', latencyMs: 1, failed: false });
    await vi.advanceTimersByTimeAsync(API_USAGE.flushIntervalMs * 2);

    expect(prisma.apiUsageDaily.upsert).toHaveBeenCalledOnce();
  });

  it('flushes on shutdown even if it never started', async () => {
    const { service, prisma } = createService();

    service.record({ keyId: 'key', endpoint: 'GET /v1/tanks', latencyMs: 1, failed: false });
    await service.onModuleDestroy();

    expect(prisma.apiUsageDaily.upsert).toHaveBeenCalledOnce();
  });
});
