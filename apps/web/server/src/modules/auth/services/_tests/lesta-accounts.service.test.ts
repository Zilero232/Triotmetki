import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { LestaClient } from '../../../../lib/lesta';
import type { EntitlementsService } from '../../../billing';
import type { CollectorProducerService } from '../../../collector';

import { createTokenCipher } from '../../../../core/token-cipher/_tests/token-cipher.fixtures';
import { LestaAccountsService } from '../lesta-accounts.service';

const identity = { userId: 'user', accountId: 7, nickname: 'Tanker', accessToken: 'token', expiresAt: new Date() };

const createService = ({ others, isKnown }: { others: number; isKnown: boolean }) => {
  const prisma = mockDeep<PrismaService>();
  const entitlements = mock<EntitlementsService>();
  const collector = mock<CollectorProducerService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  prisma.userLestaAccount.count
    .mockResolvedValueOnce(others)
    .mockResolvedValueOnce(isKnown ? 1 : 0)
    .mockResolvedValueOnce(0);

  entitlements.limit.mockResolvedValue(2);

  const lesta = mockDeep<LestaClient>();
  const cipher = createTokenCipher();

  return { service: new LestaAccountsService(prisma, collector, entitlements, lesta, cipher), prisma, collector, lesta, cipher };
};

describe('LestaAccountsService.link', () => {
  it('refuses a new account over the linked accounts limit of the plan', async () => {
    const { service, prisma, collector } = createService({ others: 2, isKnown: false });

    await expect(service.link(identity)).resolves.toBe(false);
    expect(prisma.userLestaAccount.upsert).not.toHaveBeenCalled();
    expect(collector.enrol).not.toHaveBeenCalled();
  });

  it('still signs in with an account that is already linked', async () => {
    const { service, prisma } = createService({ others: 2, isKnown: true });

    await expect(service.link(identity)).resolves.toBe(true);
    expect(prisma.userLestaAccount.upsert).toHaveBeenCalled();
  });

  it('stores the Lesta access token encrypted', async () => {
    const { service, prisma, cipher } = createService({ others: 0, isKnown: false });

    await service.link(identity);

    const stored = prisma.userLestaAccount.upsert.mock.calls[0]?.[0]?.create.accessToken;

    expect(stored).not.toBe(identity.accessToken);
    expect(typeof stored === 'string' ? await cipher.open(stored) : null).toBe(identity.accessToken);
  });

  it('revokes the decrypted token at Lesta', async () => {
    const { service, prisma, lesta, cipher } = createService({ others: 0, isKnown: false });

    prisma.userLestaAccount.findMany.mockResolvedValue([mock<UserLestaAccount>({ accountId: 7n, accessToken: await cipher.seal('plain-token') })]);
    lesta.auth.logout.mockResolvedValue(undefined);

    await service.revokeTokens('user');

    expect(lesta.auth.logout).toHaveBeenCalledWith({ accessToken: 'plain-token' });
  });

  it('links an account within the limit', async () => {
    const { service } = createService({ others: 1, isKnown: false });

    await expect(service.link(identity)).resolves.toBe(true);
  });

  it('clears a stale token and queues a garage sync when the account is relinked', async () => {
    const { service, prisma } = createService({ others: 0, isKnown: true });

    await service.link(identity);

    expect(prisma.userLestaAccount.upsert.mock.calls[0]?.[0].update).toMatchObject({ tokenStaleAt: null, garageSyncedAt: null });
  });
});

describe('LestaAccountsService.primaryAccountId', () => {
  it('returns the primary linked account first', async () => {
    const { service, prisma } = createService({ others: 0, isKnown: false });

    prisma.userLestaAccount.findFirst.mockResolvedValue(mock<UserLestaAccount>({ accountId: 42n }));

    await expect(service.primaryAccountId('user')).resolves.toBe(42);

    expect(prisma.userLestaAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: [{ isPrimary: 'desc' }, { linkedAt: 'asc' }] })
    );
  });

  it('returns null without a linked account', async () => {
    const { service, prisma } = createService({ others: 0, isKnown: false });

    prisma.userLestaAccount.findFirst.mockResolvedValue(null);

    await expect(service.primaryAccountId('user')).resolves.toBeNull();
  });
});
