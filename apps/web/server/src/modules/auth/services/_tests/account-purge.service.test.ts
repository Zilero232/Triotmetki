import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { EntitlementsService } from '../../../billing';
import type { PurgeGuardService } from '../../../collector';
import type { CommunityContentService } from '../../../community-core';

import { AccountPurgeService } from '../account-purge.service';

const USER_ID = 'user-1';

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const communityContent = mock<CommunityContentService>();
  const entitlements = mock<EntitlementsService>();
  const purgeGuard = mock<PurgeGuardService>();

  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.userLestaAccount.findMany.mockResolvedValue([]);

  return { service: new AccountPurgeService(prisma, communityContent, entitlements, purgeGuard), prisma, communityContent, entitlements, purgeGuard };
};

describe('AccountPurgeService.purgeAccount', () => {
  it('purges the content the user wrote inside the same transaction', async () => {
    const { service, prisma, communityContent } = createService();

    await service.purgeAccount({ userId: USER_ID });

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(communityContent.purgeAuthoredBy).toHaveBeenCalledWith({ userId: USER_ID, db: prisma });
  });

  it('stops Plus from renewing and forgets the saved card without touching payments', async () => {
    const { service, prisma } = createService();

    await service.purgeAccount({ userId: USER_ID });

    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      data: expect.objectContaining({ cancelAtPeriodEnd: true, savedCardId: null })
    });

    expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    expect(prisma.payment.deleteMany).not.toHaveBeenCalled();
  });

  it('revokes developer access and removes streamer, notification, device and synced modpack data of the user', async () => {
    const { service, prisma } = createService();

    await service.purgeAccount({ userId: USER_ID });

    expect(prisma.apiKey.deleteMany).toHaveBeenCalledWith({ where: { referenceId: USER_ID } });

    for (const model of [
      prisma.webhookEndpoint,
      prisma.overlay,
      prisma.streamerIntegration,
      prisma.streamerProfile,
      prisma.notification,
      prisma.pushSubscription,
      prisma.notificationSettings,
      prisma.telegramAccount,
      prisma.modDevice,
      prisma.modSyncLibrary
    ]) {
      expect(model.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
    }
  });

  it('opens a user deletion request for every linked Lesta account before unlinking them', async () => {
    const { service, prisma, purgeGuard } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([mock<UserLestaAccount>({ accountId: 7n }), mock<UserLestaAccount>({ accountId: 9n })]);

    await service.purgeAccount({ userId: USER_ID });

    expect(purgeGuard.open).toHaveBeenCalledWith(expect.objectContaining({ db: prisma, accountIds: [7n, 9n], source: 'user' }));
    expect(purgeGuard.open.mock.invocationCallOrder[0]).toBeLessThan(prisma.userLestaAccount.deleteMany.mock.invocationCallOrder[0] ?? 0);
    expect(prisma.userLestaAccount.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
  });

  it('drops the cached Plus state only after the purge committed', async () => {
    const { service, prisma, entitlements } = createService();

    prisma.$transaction.mockRejectedValueOnce(new Error('rollback'));

    await expect(service.purgeAccount({ userId: USER_ID })).rejects.toThrow('rollback');
    expect(entitlements.invalidate).not.toHaveBeenCalled();

    await service.purgeAccount({ userId: USER_ID });
    expect(entitlements.invalidate).toHaveBeenCalledWith(USER_ID);
  });
});
