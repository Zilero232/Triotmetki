import type { AuthService } from '@thallesp/nestjs-better-auth';

import { API_KEY } from '@otmetki/schemas';
import { hoursToSeconds, subHours } from 'date-fns';
import { millisecondsInSecond } from 'date-fns/constants';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { ApiKey } from '../../../../../generated';
import type { OtmetkiAuth } from '../../../../lib/auth';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { API_KEY_PLUGIN } from '../../../../lib/auth';
import { API_KEY_POLICY, API_TIERS } from '../../config/api-keys.constants';
import { ApiKeysWriterService } from '../api-keys-writer.service';
import { ApiTierReaderService } from '../api-tier-reader.service';
import { ApiTierSyncService } from '../api-tier-sync.service';

const NOW = new Date('2026-09-26T12:00:00Z');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const keyRow = (overrides: Partial<ApiKey> = {}): ApiKey => ({
  id: '00000000-0000-4000-8000-000000000001',
  configId: 'default',
  referenceId: 'user',
  name: 'bot',
  start: `${API_KEY_PLUGIN.prefix}AbCdEfGh`,
  prefix: API_KEY_PLUGIN.prefix,
  key: 'hashed',
  permissions: null,
  metadata: JSON.stringify({ tier: 'free' }),
  enabled: true,
  rateLimitEnabled: false,
  rateLimitTimeWindow: null,
  rateLimitMax: null,
  requestCount: 0,
  remaining: API_TIERS.free.requestsPerDay,
  refillInterval: API_KEY_POLICY.quotaRefillMs,
  refillAmount: API_TIERS.free.requestsPerDay,
  lastRefillAt: null,
  lastRequest: null,
  expiresAt: null,
  createdAt: NOW,
  updatedAt: NOW,
  ...overrides
});

const createService = () => {
  const prisma = mockPrismaService();
  const tiers = mock<ApiTierReaderService>();
  const auth = mockDeep<AuthService<OtmetkiAuth>>();
  const tierSync = mock<ApiTierSyncService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  tiers.tierFor.mockResolvedValue('free');
  tiers.cachedTierFor.mockResolvedValue('free');

  return { service: new ApiKeysWriterService(prisma, tiers, tierSync, auth), prisma, tiers, auth, tierSync };
};

const verified = (overrides: Partial<ApiKey> = {}) => {
  const { key: _hash, metadata, ...row } = keyRow(overrides);

  return { valid: true, error: null, key: { ...row, metadata: metadata === null ? null : JSON.parse(metadata), permissions: null } };
};

describe('ApiKeysWriterService.create', () => {
  it('creates the key through the plugin with the daily quota of the owner tier', async () => {
    const { service, prisma, tiers, auth } = createService();

    prisma.apiKey.count.mockResolvedValue(0);
    tiers.tierFor.mockResolvedValue('plus');
    auth.api.createApiKey.mockResolvedValue({ ...keyRow({ metadata: null }), key: 'otm_secret', metadata: { tier: 'plus' }, permissions: null });

    const created = await service.create({ userId: 'user', name: 'bot' });
    const body = auth.api.createApiKey.mock.calls[0]?.[0]?.body;

    expect(body).toMatchObject({ userId: 'user', name: 'bot', metadata: { tier: 'plus' } });
    expect(body?.refillAmount).toBeUndefined();
    expect(body?.remaining ?? null).toBeNull();
    expect(created.secret).toBe('otm_secret');
    expect(created.key.tier).toBe('plus');
  });

  it('refuses a key over the active-key limit', async () => {
    const { service, prisma, auth } = createService();

    prisma.apiKey.count.mockResolvedValue(API_KEY.maxActivePerUser);

    await expect(service.create({ userId: 'user', name: 'bot' })).rejects.toMatchObject({ response: { code: 'CONFLICT' } });
    expect(auth.api.createApiKey).not.toHaveBeenCalled();
  });

  it('refuses an expiry in the past', async () => {
    const { service } = createService();

    await expect(service.create({ userId: 'user', name: 'bot', expiresAt: NOW.toISOString() })).rejects.toMatchObject({
      response: { code: 'VALIDATION_FAILED' }
    });
  });
});

describe('ApiKeysWriterService.revoke', () => {
  it('switches the key off instead of deleting it, keeping its usage history', async () => {
    const { service, prisma, auth } = createService();

    prisma.apiKey.findFirst.mockResolvedValue(keyRow());

    await service.revoke({ userId: 'user', id: keyRow().id });

    expect(auth.api.updateApiKey.mock.calls[0]?.[0]?.body).toMatchObject({ keyId: keyRow().id, userId: 'user', enabled: false });
  });

  it('leaves an already disabled key alone', async () => {
    const { service, prisma, auth } = createService();

    prisma.apiKey.findFirst.mockResolvedValue(keyRow({ enabled: false }));

    await service.revoke({ userId: 'user', id: keyRow().id });

    expect(auth.api.updateApiKey).not.toHaveBeenCalled();
  });

  it('answers 404 for somebody else’s key', async () => {
    const { service, prisma } = createService();

    prisma.apiKey.findFirst.mockResolvedValue(null);

    await expect(service.revoke({ userId: 'user', id: 'id' })).rejects.toMatchObject({ response: { code: 'NOT_FOUND' } });
  });
});

describe('ApiKeysWriterService.verify', () => {
  it('returns the owner, the tier and the daily budget left', async () => {
    const { service, auth } = createService();

    auth.api.verifyApiKey.mockResolvedValue(verified({ remaining: 42 }));

    await expect(service.verify('otm_key')).resolves.toEqual({
      id: keyRow().id,
      userId: 'user',
      tier: 'free',
      dailyLimit: API_TIERS.free.requestsPerDay,
      dailyRemaining: 42
    });
  });

  it('falls back to the tier quota when the key carries no tier, refill amount or remaining count', async () => {
    const { service, auth } = createService();

    auth.api.verifyApiKey.mockResolvedValue(verified({ metadata: null, refillAmount: null, remaining: null }));

    await expect(service.verify('otm_key')).resolves.toMatchObject({
      tier: 'free',
      dailyLimit: API_TIERS.free.requestsPerDay,
      dailyRemaining: API_TIERS.free.requestsPerDay
    });
  });

  it('tells a revoked key from an unknown one', async () => {
    const { service, auth } = createService();

    auth.api.verifyApiKey.mockResolvedValueOnce({ valid: false, error: { code: 'KEY_DISABLED', message: 'disabled' }, key: null });

    await expect(service.verify('otm_key')).rejects.toMatchObject({ response: { code: 'API_KEY_REVOKED' } });

    auth.api.verifyApiKey.mockResolvedValueOnce({ valid: false, error: { code: 'INVALID_API_KEY', message: 'invalid' }, key: null });

    await expect(service.verify('otm_key')).rejects.toMatchObject({ response: { code: 'API_KEY_INVALID' } });
  });

  it('answers 429 with a Retry-After until the refill once the daily quota is used up', async () => {
    const { service, prisma, auth } = createService();

    auth.api.verifyApiKey.mockResolvedValue({ valid: false, error: { code: 'USAGE_EXCEEDED', message: 'used up' }, key: null });
    prisma.apiKey.findUnique.mockResolvedValue(keyRow({ lastRefillAt: subHours(NOW, 1) }));

    const error = await service.verify('otm_key').catch((caught: unknown) => caught);

    expect(error).toMatchObject({
      response: { code: 'PLAN_LIMIT_REACHED' },
      retryAfterSec: API_KEY_POLICY.quotaRefillMs / millisecondsInSecond - hoursToSeconds(1)
    });
  });

  it('answers 429 without a Retry-After when the used-up key row is gone', async () => {
    const { service, prisma, auth } = createService();

    auth.api.verifyApiKey.mockResolvedValue({ valid: false, error: { code: 'USAGE_EXCEEDED', message: 'used up' }, key: null });
    prisma.apiKey.findUnique.mockResolvedValue(null);

    await expect(service.verify('otm_key')).rejects.toMatchObject({ response: { code: 'PLAN_LIMIT_REACHED' }, retryAfterSec: null });
  });

  it('takes the tier from the owner, not from the key metadata', async () => {
    const { service, auth } = createService();

    auth.api.verifyApiKey.mockResolvedValue(
      verified({ metadata: JSON.stringify({ tier: 'community' }), refillAmount: 10_000_000, remaining: 9_999_999 })
    );

    await expect(service.verify('otm_key')).resolves.toMatchObject({
      tier: 'free',
      dailyLimit: API_TIERS.free.requestsPerDay,
      dailyRemaining: API_TIERS.free.requestsPerDay
    });
  });

  it('leaves the keys alone when the owner tier did not change', async () => {
    const { service, tiers, auth, tierSync } = createService();

    auth.api.verifyApiKey.mockResolvedValue(verified());

    await service.verify('otm_key');
    await vi.waitFor(() => expect(tiers.cachedTierFor).toHaveBeenCalledWith('user'));
    await Promise.resolve();

    expect(tierSync.apply).not.toHaveBeenCalled();
  });

  it('moves the owner keys to a changed tier in the background', async () => {
    const { service, tiers, auth, tierSync } = createService();

    tiers.cachedTierFor.mockResolvedValue('plus');
    auth.api.verifyApiKey.mockResolvedValue(verified());

    await service.verify('otm_key');
    await vi.waitFor(() => expect(tierSync.apply).toHaveBeenCalledWith({ userId: 'user', tier: 'plus' }));
  });
});
