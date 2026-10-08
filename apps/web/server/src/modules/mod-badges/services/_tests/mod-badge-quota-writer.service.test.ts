import RedisMock from 'ioredis-mock';
import { range } from 'remeda';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';

import { MOD_BADGES_QUOTA } from '../../config/mod-badges.constants';
import { secondsUntilNextDay } from '../../lib/badge-quota/badge-quota';
import { ModBadgeQuotaWriterService } from '../mod-badge-quota-writer.service';

const NOW = new Date('2026-10-06T12:00:00.000Z');
const BATCH = 100;

const createService = () => {
  const config = mock<AppConfigService>();

  config.get.mockReturnValue('server-secret-for-tests');

  return new ModBadgeQuotaWriterService(config, new RedisMock());
};

const askDistinct = async ({ service, subject, count }: { service: ModBadgeQuotaWriterService; subject: string; count: number }) => {
  for (let start = 1; start <= count; start += BATCH) {
    await service.claim({ subject, accountIds: range(start, Math.min(start + BATCH, count + 1)), now: NOW });
  }
};

describe('ModBadgeQuotaWriterService.claim', () => {
  it('lets a device ask for distinct accounts up to the daily cap', async () => {
    const service = createService();

    await askDistinct({ service, subject: 'dev_a', count: MOD_BADGES_QUOTA.distinctIdsPerDay - 1 });

    await expect(service.claim({ subject: 'dev_a', accountIds: [999_999_999], now: NOW })).resolves.toBeNull();
  });

  it('refuses a device past the daily cap until Moscow midnight', async () => {
    const service = createService();

    await askDistinct({ service, subject: 'dev_a', count: MOD_BADGES_QUOTA.distinctIdsPerDay });

    await expect(service.claim({ subject: 'dev_a', accountIds: [999_999_999], now: NOW })).resolves.toBe(secondsUntilNextDay(NOW));
  });

  it('does not charge again for accounts the device already asked about today', async () => {
    const service = createService();

    for (let repeat = 0; repeat <= MOD_BADGES_QUOTA.distinctIdsPerDay / BATCH; repeat += 1) {
      await service.claim({ subject: 'dev_a', accountIds: range(1, BATCH + 1), now: NOW });
    }

    await expect(service.claim({ subject: 'dev_a', accountIds: range(1, BATCH + 1), now: NOW })).resolves.toBeNull();
  });

  it('keeps the quota of one device away from another', async () => {
    const service = createService();

    await askDistinct({ service, subject: 'dev_a', count: MOD_BADGES_QUOTA.distinctIdsPerDay });

    await expect(service.claim({ subject: 'dev_b', accountIds: [1], now: NOW })).resolves.toBeNull();
  });
});
