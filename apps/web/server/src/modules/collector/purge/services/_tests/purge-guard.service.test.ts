import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { DataDeletionRequest } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';

import { PURGE } from '../../config';
import { PurgeGuardService } from '../purge-guard.service';

const createGuard = () => {
  const prisma = mockDeep<PrismaService>();

  return { prisma, guard: new PurgeGuardService(prisma) };
};

describe('PurgeGuardService.blocked', () => {
  it('answers an empty batch without a query', async () => {
    const { prisma, guard } = createGuard();

    expect(await guard.blocked([])).toEqual(new Set());
    expect(prisma.dataDeletionRequest.findMany).not.toHaveBeenCalled();
  });

  it('blocks accounts with a user or Lesta deletion request that is not failed', async () => {
    const { prisma, guard } = createGuard();

    prisma.dataDeletionRequest.findMany.mockResolvedValue([mock<DataDeletionRequest>({ accountId: 2n })]);

    expect(await guard.blocked([1, 2])).toEqual(new Set([2]));

    expect(prisma.dataDeletionRequest.findMany.mock.calls[0]?.[0]?.where).toMatchObject({
      accountId: { in: [1n, 2n] },
      source: { in: PURGE.blockingSources },
      status: { in: PURGE.blockingStatuses }
    });
  });
});

describe('PurgeGuardService.open', () => {
  it('opens one request per account and hides the players until the purge runs', async () => {
    const { prisma, guard } = createGuard();

    await guard.open({ db: prisma, accountIds: [1n, 2n], source: 'user', reason: 'account deleted' });

    expect(prisma.dataDeletionRequest.createMany).toHaveBeenCalledWith({
      data: [
        { accountId: 1n, source: 'user', reason: 'account deleted' },
        { accountId: 2n, source: 'user', reason: 'account deleted' }
      ]
    });

    expect(prisma.player.updateMany).toHaveBeenCalledWith({ where: { accountId: { in: [1n, 2n] } }, data: { isHidden: true } });
  });

  it('writes nothing for an empty account list', async () => {
    const { prisma, guard } = createGuard();

    await guard.open({ db: prisma, accountIds: [], source: 'lesta', reason: 'request' });

    expect(prisma.dataDeletionRequest.createMany).not.toHaveBeenCalled();
    expect(prisma.player.updateMany).not.toHaveBeenCalled();
  });
});

describe('PURGE.blockingStatuses', () => {
  it('keeps a failed user or Lesta request blocking collection until it is retried', () => {
    expect(PURGE.blockingStatuses).toContain('failed');
  });
});
