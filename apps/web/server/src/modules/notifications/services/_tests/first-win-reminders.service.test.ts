import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { NotificationSettings, UserLestaAccount } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { FirstWinReaderService } from '../../../analytics';
import type { NotificationService } from '../notification.service';

import { dailyWindow } from '../../../analytics';
import { FIRST_WIN_REMINDER } from '../../config/watchers.constants';
import { FirstWinRemindersService } from '../first-win-reminders.service';

const NOW = new Date('2026-09-26T09:00:00.000Z');

const settings = (userId: string): NotificationSettings => mock<NotificationSettings>({ userId });

const link = Object.assign(mock<UserLestaAccount>({ accountId: 42n }), { player: { nickname: 'Tanker' } });

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const firstWin = mock<FirstWinReaderService>();
  const notifications = mock<NotificationService>();

  prisma.notificationSettings.findMany.mockResolvedValue([settings('a')]);
  prisma.userLestaAccount.findFirst.mockResolvedValue(link);
  firstWin.availableCount.mockResolvedValue(3);
  notifications.notifyMany.mockResolvedValue(1);

  return { service: new FirstWinRemindersService(prisma, firstWin, notifications), prisma, firstWin, notifications };
};

describe('FirstWinRemindersService.run', () => {
  it('reminds an active player how many first-win bonuses are left since the daily reset', async () => {
    const { service, firstWin, notifications } = createService();
    const { resetAt } = dailyWindow(NOW);

    await expect(service.run(NOW)).resolves.toBe(1);
    expect(firstWin.availableCount).toHaveBeenCalledWith({ accountId: 42n, since: resetAt });

    expect(notifications.notifyMany).toHaveBeenCalledWith({
      userIds: ['a'],
      notification: { event: 'firstWinAvailable', accountId: 42, nickname: 'Tanker', available: 3 },
      dedupeKey: `first-win-42-${resetAt.toISOString().slice(0, 10)}`
    });
  });

  it('skips a user without a recently active account', async () => {
    const { service, prisma, notifications } = createService();

    prisma.userLestaAccount.findFirst.mockResolvedValue(null);

    await expect(service.run(NOW)).resolves.toBe(0);
    expect(notifications.notifyMany).not.toHaveBeenCalled();
  });

  it('skips a player who already used every bonus today', async () => {
    const { service, firstWin, notifications } = createService();

    firstWin.availableCount.mockResolvedValue(0);

    await expect(service.run(NOW)).resolves.toBe(0);
    expect(notifications.notifyMany).not.toHaveBeenCalled();
  });

  it('continues to the next page only after a full page', async () => {
    const { service, prisma } = createService();
    const full = Array.from({ length: FIRST_WIN_REMINDER.batchSize }, (_, index) => settings(`u${index}`));

    prisma.notificationSettings.findMany.mockResolvedValueOnce(full).mockResolvedValueOnce([]);

    await expect(service.run(NOW)).resolves.toBe(FIRST_WIN_REMINDER.batchSize);
    expect(prisma.notificationSettings.findMany).toHaveBeenCalledTimes(2);
  });
});
