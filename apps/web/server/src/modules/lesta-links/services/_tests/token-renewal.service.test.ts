import { addDays, addHours, fromUnixTime, subHours } from 'date-fns';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { UserLestaAccount } from '../../../../../generated';
import type { LestaClients, PrismaService } from '../../../../core';
import type { NotificationService } from '../../../notifications';

import { createTokenCipher } from '../../../../core/token-cipher/_tests/token-cipher.fixtures';
import { LestaApiError } from '../../../../lib/lesta';
import { relinkDedupeKey } from '../../lib';
import { TokenRenewalService } from '../token-renewal.service';

const NOW = new Date('2026-09-28T04:40:00Z');

const due = (overrides: Partial<UserLestaAccount> = {}) =>
  Object.assign(
    mock<UserLestaAccount>({ userId: 'user', accountId: 7n, accessToken: 'old-token', tokenExpiresAt: addHours(NOW, 12), ...overrides }),
    { player: { nickname: 'Tanker' } }
  );

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const clients = mockDeep<LestaClients>();
  const notifications = mock<NotificationService>();

  const cipher = createTokenCipher();

  return { service: new TokenRenewalService(prisma, clients, notifications, cipher), prisma, clients, notifications, cipher };
};

describe('TokenRenewalService.run', () => {
  it('stores the renewed token encrypted with its new expiry', async () => {
    const { service, prisma, clients, notifications, cipher } = createService();
    const expiresAt = Math.floor(addDays(NOW, 13).getTime() / 1000);

    prisma.userLestaAccount.findMany.mockResolvedValue([due({ accessToken: await cipher.seal('old-token') })]);
    clients.priority.auth.prolongate.mockResolvedValue({ access_token: 'new-token', account_id: 7, expires_at: expiresAt });

    await expect(service.run(NOW)).resolves.toMatchObject({ due: 1, renewed: 1, stale: 0 });
    expect(clients.priority.auth.prolongate).toHaveBeenCalledWith(expect.objectContaining({ accessToken: 'old-token' }));

    const [update] = prisma.userLestaAccount.update.mock.calls[0] ?? [];
    const stored = update?.data.accessToken;

    expect(update?.where).toEqual({ accountId: 7n });
    expect(update?.data.tokenExpiresAt).toEqual(fromUnixTime(expiresAt));
    expect(stored).not.toBe('new-token');
    expect(typeof stored === 'string' ? await cipher.open(stored) : null).toBe('new-token');

    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('marks a rejected token stale and asks the owner to relink once', async () => {
    const { service, prisma, clients, notifications } = createService();
    const link = due();

    prisma.userLestaAccount.findMany.mockResolvedValue([link]);
    clients.priority.auth.prolongate.mockRejectedValue(new LestaApiError({ code: 'INVALID_ACCESS_TOKEN', method: 'auth/prolongate' }));

    await expect(service.run(NOW)).resolves.toMatchObject({ stale: 1, renewed: 0 });
    expect(prisma.userLestaAccount.update).toHaveBeenCalledWith({ where: { accountId: 7n }, data: { tokenStaleAt: NOW, accessToken: null } });

    expect(notifications.notify).toHaveBeenCalledWith({
      userId: 'user',
      notification: { event: 'lestaRelinkRequired', accountId: 7, nickname: 'Tanker' },
      dedupeKey: relinkDedupeKey({ accountId: 7n, expiresAt: link.tokenExpiresAt })
    });
  });

  it('keeps a live token after an outage and retries on the next run', async () => {
    const { service, prisma, clients, notifications } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([due()]);
    clients.priority.auth.prolongate.mockRejectedValue(new LestaApiError({ code: 'SOURCE_NOT_AVAILABLE', method: 'auth/prolongate' }));

    await expect(service.run(NOW)).resolves.toMatchObject({ failed: 1, stale: 0 });
    expect(prisma.userLestaAccount.update).not.toHaveBeenCalled();
    expect(notifications.notify).not.toHaveBeenCalled();
  });

  it('gives up on a token that already expired even when Lesta is only unavailable', async () => {
    const { service, prisma, clients, notifications } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([due({ tokenExpiresAt: subHours(NOW, 1) })]);
    clients.priority.auth.prolongate.mockRejectedValue(new LestaApiError({ code: 'SOURCE_NOT_AVAILABLE', method: 'auth/prolongate' }));

    await expect(service.run(NOW)).resolves.toMatchObject({ stale: 1 });
    expect(notifications.notify).toHaveBeenCalledOnce();
  });
});
