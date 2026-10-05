import { subDays } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { ApiErrorLog, ApiKey, ApiUsageDaily } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { ApiKeysWriterService } from '../api-keys-writer.service';
import type { ApiTierReaderService } from '../api-tier-reader.service';

import { AppNotFoundException } from '../../../../common/exceptions';
import { API_TIERS } from '../../config/api-keys.constants';
import { API_USAGE_REPORT } from '../../config/api-usage.constants';
import { ApiUsageReaderService } from '../api-usage-reader.service';

const NOW = new Date('2026-05-10T15:30:00.000Z');
const TODAY = '2026-05-10';
const YESTERDAY = '2026-05-09';
const KEY_ID = 'key';

const usageRow = (day: string, overrides: Partial<ApiUsageDaily> = {}): ApiUsageDaily => ({
  apiKeyId: KEY_ID,
  day: new Date(`${day}T00:00:00.000Z`),
  endpoint: 'GET /v1/players/:id',
  requests: 10,
  errors: 1,
  throttled: 0,
  latencyMsTotal: 500n,
  ...overrides
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const keys = mock<ApiKeysWriterService>();
  const tiers = mock<ApiTierReaderService>();

  keys.owned.mockResolvedValue(mock<ApiKey>({ id: KEY_ID }));
  tiers.tierFor.mockResolvedValue('plus');
  prisma.apiUsageDaily.findMany.mockResolvedValue([]);
  prisma.apiErrorLog.findMany.mockResolvedValue([]);

  return { service: new ApiUsageReaderService(prisma, keys, tiers), prisma, keys };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ApiUsageReaderService.usage', () => {
  it('does not read usage of a key the user does not own', async () => {
    const { service, prisma, keys } = createService();

    keys.owned.mockRejectedValue(new AppNotFoundException('NOT_FOUND', 'API key not found'));

    await expect(service.usage({ userId: 'user', id: KEY_ID, days: 7 })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.apiUsageDaily.findMany).not.toHaveBeenCalled();
  });

  it('reads a window of exactly the requested days, starting at midnight UTC', async () => {
    const { service, prisma } = createService();

    await service.usage({ userId: 'user', id: KEY_ID, days: 7 });

    const expectedFrom = new Date(`${subDays(NOW, 6).toISOString().slice(0, 10)}T00:00:00.000Z`);

    expect(prisma.apiUsageDaily.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { apiKeyId: KEY_ID, day: { gte: expectedFrom } } }));
  });

  it('reports the limits of the owner tier', async () => {
    const { service } = createService();

    const report = await service.usage({ userId: 'user', id: KEY_ID, days: 1 });

    expect(report.tier).toBe('plus');
    expect(report.limits).toEqual(API_TIERS.plus);
  });

  it('sums only today rows into the today point', async () => {
    const { service, prisma } = createService();

    prisma.apiUsageDaily.findMany.mockResolvedValue([
      usageRow(YESTERDAY, { requests: 100 }),
      usageRow(TODAY, { requests: 4, errors: 1, throttled: 2, latencyMsTotal: 100n }),
      usageRow(TODAY, { endpoint: 'GET /v1/clans/:id', requests: 6, errors: 0, throttled: 1, latencyMsTotal: 900n })
    ]);

    const report = await service.usage({ userId: 'user', id: KEY_ID, days: 7 });

    expect(report.today).toEqual({ day: TODAY, requests: 10, errors: 1, throttled: 3, avgLatencyMs: 100 });
  });

  it('reports an empty today with no average latency when the key was idle', async () => {
    const { service, prisma } = createService();

    prisma.apiUsageDaily.findMany.mockResolvedValue([usageRow(YESTERDAY)]);

    const report = await service.usage({ userId: 'user', id: KEY_ID, days: 7 });

    expect(report.today).toEqual({ day: TODAY, requests: 0, errors: 0, throttled: 0, avgLatencyMs: null });
  });

  it('keeps one history point per day with traffic', async () => {
    const { service, prisma } = createService();

    prisma.apiUsageDaily.findMany.mockResolvedValue([usageRow(YESTERDAY), usageRow(TODAY), usageRow(TODAY, { endpoint: 'GET /v1/clans/:id' })]);

    const report = await service.usage({ userId: 'user', id: KEY_ID, days: 7 });

    expect(report.history.map((point) => point.day)).toEqual([YESTERDAY, TODAY]);
    expect(report.topEndpoints.map((entry) => entry.endpoint)).toEqual(['GET /v1/players/:id', 'GET /v1/clans/:id']);
  });
});

describe('ApiUsageReaderService.errors', () => {
  it('does not read the error log of a key the user does not own', async () => {
    const { service, prisma, keys } = createService();

    keys.owned.mockRejectedValue(new AppNotFoundException('NOT_FOUND', 'API key not found'));

    await expect(service.errors({ userId: 'user', id: KEY_ID })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.apiErrorLog.findMany).not.toHaveBeenCalled();
  });

  it('returns the newest errors capped at the report limit', async () => {
    const { service, prisma } = createService();

    await service.errors({ userId: 'user', id: KEY_ID });

    expect(prisma.apiErrorLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { apiKeyId: KEY_ID }, orderBy: { occurredAt: 'desc' }, take: API_USAGE_REPORT.errorLogLimit })
    );
  });

  it('serialises the occurrence time and keeps a missing code and message null', async () => {
    const { service, prisma } = createService();
    const row: ApiErrorLog = {
      id: 'e1',
      apiKeyId: KEY_ID,
      method: 'GET',
      path: '/v1/players/1',
      status: 500,
      code: null,
      message: null,
      occurredAt: NOW
    };

    prisma.apiErrorLog.findMany.mockResolvedValue([row]);

    expect(await service.errors({ userId: 'user', id: KEY_ID })).toEqual([
      { id: 'e1', method: 'GET', path: '/v1/players/1', status: 500, code: null, message: null, occurredAt: NOW.toISOString() }
    ]);
  });
});
