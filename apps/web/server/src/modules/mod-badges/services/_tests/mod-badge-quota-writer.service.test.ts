import RedisMock from 'ioredis-mock';
import { range } from 'remeda';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { AppConfigService } from '../../../../config';

import { secondsUntilNextDay } from '../../../../common/lib';
import { MOD_BADGES_QUOTA } from '../../config/mod-badges.constants';
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

describe('ModBadgeQuotaWriterService.claim at the cap', () => {
  it('still answers a device at the cap that asks only about accounts it already asked about', async () => {
    const service = createService();

    await askDistinct({ service, subject: 'dev_full', count: MOD_BADGES_QUOTA.distinctIdsPerDay });

    await expect(service.claim({ subject: 'dev_full', accountIds: [1, 2, 3], now: NOW })).resolves.toBeNull();
  });

  it('refuses a request whose new accounts would pass the cap', async () => {
    const service = createService();

    await askDistinct({ service, subject: 'dev_near', count: MOD_BADGES_QUOTA.distinctIdsPerDay - 1 });

    const claim = service.claim({ subject: 'dev_near', accountIds: [999_999_998, 999_999_999], now: NOW });

    await expect(claim).resolves.toBe(secondsUntilNextDay(NOW));
  });
});

describe('ModBadgeQuotaWriterService.claimForClient', () => {
  it('counts two /56 networks of one IPv6 /48 against one shared quota', async () => {
    const service = createService();
    const half = MOD_BADGES_QUOTA.distinctIdsPerDay / 2;

    await service.claimForClient({ ip: '2001:db8:7:100::1', accountIds: range(1, half + 1), now: NOW });
    await service.claimForClient({ ip: '2001:db8:7:200::1', accountIds: range(half + 1, 2 * half + 1), now: NOW });

    const claim = service.claimForClient({ ip: '2001:db8:7:300::1', accountIds: [999_999_999], now: NOW });

    await expect(claim).resolves.toBe(secondsUntilNextDay(NOW));
  });
});

describe('ModBadgeQuotaWriterService.claimOwnForClient', () => {
  const claimOwn = (service: ModBadgeQuotaWriterService, accountId: number) => service.claimOwnForClient({ ip: '198.51.100.9', accountId, now: NOW });

  it('lets one address report its own accounts up to the daily cap', async () => {
    const service = createService();

    for (let accountId = 1; accountId < MOD_BADGES_QUOTA.ownIdsPerDay; accountId += 1) {
      await claimOwn(service, accountId);
    }

    await expect(claimOwn(service, MOD_BADGES_QUOTA.ownIdsPerDay)).resolves.toBe(true);
  });

  it('ignores one more own account past the cap', async () => {
    const service = createService();

    for (let accountId = 1; accountId <= MOD_BADGES_QUOTA.ownIdsPerDay; accountId += 1) {
      await claimOwn(service, accountId + 100);
    }

    await expect(claimOwn(service, 999)).resolves.toBe(false);
  });

  it('keeps accepting an own account it already reported today', async () => {
    const service = createService();

    for (let accountId = 1; accountId <= MOD_BADGES_QUOTA.ownIdsPerDay; accountId += 1) {
      await claimOwn(service, accountId + 200);
    }

    await expect(claimOwn(service, 201)).resolves.toBe(true);
  });
});
