import { apiTierSchema } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { ApiKey } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { EntitlementsBusService, EntitlementsService } from '../../../billing';

import { API_TIERS } from '../../config/api-keys.constants';
import { ApiTierReaderService } from '../api-tier-reader.service';

const createService = ({ communityKeys, isPlus }: { communityKeys: number; isPlus: boolean }) => {
  const prisma = mockDeep<PrismaService>();
  const entitlements = mock<EntitlementsService>();

  prisma.apiKey.findMany.mockResolvedValue(
    Array.from({ length: communityKeys }, () => mock<ApiKey>({ metadata: JSON.stringify({ tier: 'community' }) }))
  );

  entitlements.isPlus.mockResolvedValue(isPlus);

  return { service: new ApiTierReaderService(prisma, entitlements, mock<EntitlementsBusService>()), entitlements };
};

describe('ApiTierReaderService.tierFor', () => {
  it('gives everybody the free tier by default', async () => {
    expect(await createService({ communityKeys: 0, isPlus: false }).service.tierFor('user')).toBe('free');
  });

  it('raises the personal limits of a Plus subscriber', async () => {
    expect(await createService({ communityKeys: 0, isPlus: true }).service.tierFor('user')).toBe('plus');
  });

  it('keeps an admin-granted community app on the community tier', async () => {
    expect(await createService({ communityKeys: 1, isPlus: true }).service.tierFor('user')).toBe('community');
  });
});

describe('ApiTierReaderService.cachedTierFor', () => {
  it('answers from the cache after the first lookup', async () => {
    const { service, entitlements } = createService({ communityKeys: 0, isPlus: false });

    await service.cachedTierFor('user');
    await service.cachedTierFor('user');

    expect(entitlements.isPlus).toHaveBeenCalledTimes(1);
  });

  it('looks the tier up again once billing reports a change', async () => {
    const { service, entitlements } = createService({ communityKeys: 0, isPlus: false });

    await service.cachedTierFor('user');
    service.forget('user');
    await service.cachedTierFor('user');

    expect(entitlements.isPlus).toHaveBeenCalledTimes(2);
  });
});

describe('ApiTierReaderService.tiers', () => {
  it('lists every tier once with the limits the rate limiter enforces and no price', () => {
    const tiers = createService({ communityKeys: 0, isPlus: false }).service.tiers();

    expect(tiers.map(({ tier }) => tier)).toEqual(apiTierSchema.options);

    for (const entry of tiers) {
      expect(entry.limits).toEqual(API_TIERS[entry.tier]);
      expect(Object.keys(entry)).toEqual(['tier', 'limits']);
    }
  });
});
