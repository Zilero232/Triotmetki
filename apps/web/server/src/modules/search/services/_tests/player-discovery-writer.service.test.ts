import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../core';
import type { LestaClient } from '../../../../lib/lesta';
import type { CollectorProducerService, PurgeGuardService } from '../../../collector';

import { SEARCH_LOOKUP } from '../../config/search.constants';
import { PlayerDiscoveryWriterService } from '../player-discovery-writer.service';

const SHORT = 'a'.repeat(SEARCH_LOOKUP.minLestaLength - 1);
const LONG = 'a'.repeat(SEARCH_LOOKUP.minLestaLength);

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const collector = mock<CollectorProducerService>();
  const lesta = mockDeep<LestaClient>();
  const purgeGuard = mock<PurgeGuardService>();

  lesta.account.list.mockResolvedValue([]);
  purgeGuard.blocked.mockResolvedValue(new Set());

  return { service: new PlayerDiscoveryWriterService(prisma, collector, lesta, purgeGuard), prisma, collector, lesta, purgeGuard };
};

describe('PlayerDiscoveryWriterService.discover', () => {
  it('does not ask Lesta for terms shorter than the minimum', async () => {
    const { service, lesta } = createService();

    await expect(service.discover([SHORT])).resolves.toEqual([]);
    expect(lesta.account.list).not.toHaveBeenCalled();
  });

  it('asks Lesta for a term exactly at the minimum length', async () => {
    const { service, lesta } = createService();

    await service.discover([LONG]);

    expect(lesta.account.list).toHaveBeenCalledOnce();
  });

  it('caps the number of terms sent to Lesta', async () => {
    const { service, lesta } = createService();
    const terms = Array.from({ length: SEARCH_LOOKUP.maxLestaTerms + 2 }, (_, index) => `${LONG}${index}`);

    await service.discover(terms);

    expect(lesta.account.list).toHaveBeenCalledTimes(SEARCH_LOOKUP.maxLestaTerms);
  });

  it('keeps the results of terms that succeeded when another term fails', async () => {
    const { service, lesta } = createService();

    lesta.account.list.mockRejectedValueOnce(new Error('rate limited')).mockResolvedValueOnce([{ account_id: 5, nickname: 'Found' }]);

    await expect(service.discover([`${LONG}1`, `${LONG}2`])).resolves.toEqual([{ account_id: 5, nickname: 'Found' }]);
  });

  it('stores nothing and enrols nobody when Lesta finds nothing', async () => {
    const { service, prisma, collector, lesta } = createService();

    lesta.account.list.mockRejectedValue(new Error('down'));

    await expect(service.discover([LONG])).resolves.toEqual([]);
    expect(prisma.player.createMany).not.toHaveBeenCalled();
    expect(collector.enrolMany).not.toHaveBeenCalled();
  });

  it('deduplicates accounts found by several terms and enrols at most the enrol limit', async () => {
    const { service, prisma, collector, lesta } = createService();
    const found = Array.from({ length: SEARCH_LOOKUP.enrolLimit + 3 }, (_, index) => ({ account_id: index + 1, nickname: `p${index}` }));

    lesta.account.list.mockResolvedValue(found);

    const result = await service.discover([`${LONG}1`, `${LONG}2`]);

    expect(result).toHaveLength(found.length);
    expect(prisma.player.createMany).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true }));
    expect(collector.enrolMany.mock.calls[0]?.[0].accountIds).toHaveLength(SEARCH_LOOKUP.enrolLimit);
  });

  it('neither stores, enrols nor returns accounts that have a deletion request', async () => {
    const { service, prisma, collector, lesta, purgeGuard } = createService();

    lesta.account.list.mockResolvedValue([
      { account_id: 1, nickname: 'Kept' },
      { account_id: 2, nickname: 'Purged' }
    ]);

    purgeGuard.blocked.mockResolvedValue(new Set([2]));

    await expect(service.discover([LONG])).resolves.toEqual([{ account_id: 1, nickname: 'Kept' }]);
    expect(prisma.player.createMany.mock.calls[0]?.[0]?.data).toEqual([{ accountId: 1n, nickname: 'Kept' }]);
    expect(collector.enrolMany.mock.calls[0]?.[0].accountIds).toEqual([1]);
  });
});
