import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { UserLestaAccount } from '../../../../../generated';
import type { LestaClient } from '../../../../lib/lesta';
import type { EntitlementsService } from '../../../billing';
import type { CollectorProducerService, PurgeGuardService } from '../../../collector';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { createTokenCipher } from '../../../../core/token-cipher/_tests/token-cipher.fixtures';
import { LestaAccountsService } from '../lesta-accounts.service';

const identity = { userId: 'user', accountId: 7, nickname: 'Tanker', accessToken: 'token', expiresAt: new Date() };

const createService = ({ others, isKnown, isCleared = true }: { others: number; isKnown: boolean; isCleared?: boolean }) => {
  const prisma = mockPrismaService();
  const entitlements = mock<EntitlementsService>();
  const collector = mock<CollectorProducerService>();
  const purgeGuard = mock<PurgeGuardService>();

  purgeGuard.liftUserRequests.mockResolvedValue(isCleared);

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  prisma.userLestaAccount.count
    .mockResolvedValueOnce(others)
    .mockResolvedValueOnce(isKnown ? 1 : 0)
    .mockResolvedValueOnce(0);

  entitlements.limit.mockResolvedValue(2);

  const lesta = mockDeep<LestaClient>();
  const cipher = createTokenCipher();

  return {
    service: new LestaAccountsService(prisma, collector, entitlements, lesta, cipher, purgeGuard),
    prisma,
    collector,
    lesta,
    cipher,
    purgeGuard
  };
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

describe('LestaAccountsService.link after a deletion request', () => {
  it('lifts the user deletion requests of the account inside the link transaction', async () => {
    const { service, prisma, purgeGuard } = createService({ others: 0, isKnown: false });

    await service.link(identity);

    expect(purgeGuard.liftUserRequests).toHaveBeenCalledWith({ db: prisma, accountId: 7n });
  });

  it('unhides and tracks the player again once nothing blocks the account', async () => {
    const { service, prisma, collector } = createService({ others: 0, isKnown: false });

    await expect(service.link(identity)).resolves.toBe(true);

    expect(prisma.player.upsert.mock.calls[0]?.[0]).toMatchObject({
      create: { trackingTier: 'active', isHidden: false },
      update: { trackingTier: 'active', isHidden: false }
    });

    expect(collector.enrol).toHaveBeenCalledWith({ accountId: 7, priority: 'high', reason: 'login' });
  });

  it('signs in but keeps the player hidden and untracked while a Lesta request stands', async () => {
    const { service, prisma, collector } = createService({ others: 0, isKnown: false, isCleared: false });

    await expect(service.link(identity)).resolves.toBe(true);

    const upsert = prisma.player.upsert.mock.calls[0]?.[0];

    expect(upsert?.create).toMatchObject({ isHidden: true });
    expect(upsert?.create).not.toHaveProperty('trackingTier');
    expect(upsert?.update).toEqual({ isHidden: true });
    expect(prisma.userLestaAccount.upsert).toHaveBeenCalled();
    expect(collector.enrol).not.toHaveBeenCalled();
  });

  it('records no nickname history for an account Lesta asked to delete', async () => {
    const { service, prisma } = createService({ others: 0, isKnown: false, isCleared: false });

    await service.link(identity);

    expect(prisma.playerNickname.upsert).not.toHaveBeenCalled();
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
