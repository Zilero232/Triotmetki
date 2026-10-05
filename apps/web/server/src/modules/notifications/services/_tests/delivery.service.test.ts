import type { Queue } from 'bullmq';

import { differenceInMilliseconds } from 'date-fns';
import RedisMock from 'ioredis-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Notification, NotificationSettings, User } from '../../../../../generated';
import type { AppConfigService } from '../../../../config';
import type { PrismaService } from '../../../../core';
import type { TelegramSenderService } from '../../../telegram';
import type { DeliverPayload } from '../../config/notifications-queue.types';
import type { DeliverJob } from '../../notifications.types';
import type { EmailService } from '../email.service';
import type { WebPushService } from '../web-push.service';

import { Prisma } from '../../../../../generated';
import { PRISMA_CODE } from '../../../../core/prisma/prisma.constants';
import { WEEKLY_DIGEST } from '../../config/watchers.constants';
import { DeliveryService } from '../delivery.service';
import { NotificationLedgerService } from '../notification-ledger.service';

const NOW = new Date('2026-09-26T23:30:00Z');

const QUIET_START = 23;

const QUIET_END = 1;

const QUIET_WINDOW_END = new Date('2026-09-27T01:00:00Z');

const job: DeliverJob = {
  userId: 'u1',
  dedupeKey: 'moe-b1',
  notification: { event: 'moeGained', accountId: 7, nickname: 'Tanker', tankId: 1, tankName: 'T-34', marks: 2, isFollowed: false }
};

const settings = (overrides: Partial<NotificationSettings> = {}): NotificationSettings => ({
  userId: 'u1',
  channels: ['site', 'telegram'],
  events: ['moeGained'],
  quietHoursStart: null,
  quietHoursEnd: null,
  sessionReport: true,
  weeklyDigest: true,
  watchlistDigest: 'daily',
  watchlistDigestAt: null,
  updatedAt: new Date(),
  ...overrides
});

const recipient = ({
  notificationSettings = settings(),
  telegramId = 42n
}: {
  notificationSettings?: NotificationSettings | null;
  telegramId?: bigint | null;
}) => ({
  ...mock<User>({ email: 'player@example.com', locale: 'ru', timezone: 'UTC' }),
  notificationSettings,
  telegramAccount: telegramId === null ? null : { telegramId },
  _count: { pushSubscriptions: 0 }
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const config = mock<AppConfigService>();
  const telegram = mock<TelegramSenderService>({ isEnabled: true });
  const webPush = mock<WebPushService>({ isEnabled: false });
  const email = mock<EmailService>();
  const queue = mock<Queue<DeliverPayload>>();

  config.get.mockReturnValue('https://triotmetki.ru');
  prisma.notification.findUnique.mockResolvedValue(null);
  prisma.notification.create.mockResolvedValue(mock<Notification>({ id: 'n1' }));
  prisma.notification.updateMany.mockResolvedValue({ count: 1 });

  const redis = new RedisMock();
  const service = new DeliveryService(prisma, config, telegram, webPush, email, redis, queue, new NotificationLedgerService(prisma));

  return { service, prisma, telegram, email, queue, redis };
};

describe('DeliveryService.deliver', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('stores a site notification and sends telegram when both are enabled', async () => {
    const { service, prisma, telegram } = createService();

    prisma.user.findUnique.mockResolvedValue(recipient({}));

    const delivered = await service.deliver(job);

    expect(delivered).toBe(2);
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(telegram.sendNotification).toHaveBeenCalledWith(expect.objectContaining({ telegramId: 42n, locale: 'ru' }));
  });

  it('falls back to the default settings, which only use the site inbox', async () => {
    const { service, prisma, telegram } = createService();

    prisma.user.findUnique.mockResolvedValue(recipient({ notificationSettings: null }));

    expect(await service.deliver(job)).toBe(1);
    expect(telegram.sendNotification).not.toHaveBeenCalled();
  });

  it('does not send a channel twice when a retry finds it already sent', async () => {
    const { service, prisma, telegram } = createService();

    prisma.user.findUnique.mockResolvedValue(recipient({}));
    prisma.notification.findUnique.mockResolvedValue(mock<Notification>({ id: 'n1', sentAt: new Date() }));

    await service.deliver(job);

    expect(telegram.sendNotification).not.toHaveBeenCalled();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('marks a failed channel and throws so the job retries', async () => {
    const { service, prisma, telegram } = createService();

    prisma.user.findUnique.mockResolvedValue(recipient({}));
    telegram.sendNotification.mockRejectedValue(new Error('blocked'));

    await expect(service.deliver(job)).rejects.toThrow(/1 of 2/u);
    expect(prisma.notification.update).toHaveBeenCalledWith(expect.objectContaining({ data: { failedAt: expect.any(Date), claimedAt: null } }));
  });

  it('defers telegram to the end of a quiet window crossing midnight but fills the inbox at once', async () => {
    const { service, prisma, telegram, queue } = createService();

    prisma.user.findUnique.mockResolvedValue(
      recipient({ notificationSettings: settings({ quietHoursStart: QUIET_START, quietHoursEnd: QUIET_END }) })
    );

    expect(await service.deliver(job)).toBe(1);
    expect(telegram.sendNotification).not.toHaveBeenCalled();

    expect(queue.add).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ onlyChannels: ['telegram'] }),
      expect.objectContaining({ delay: differenceInMilliseconds(QUIET_WINDOW_END, NOW) })
    );
  });

  it('delivers at once when the current hour equals the end of quiet hours', async () => {
    const { service, prisma, telegram, queue } = createService();

    prisma.user.findUnique.mockResolvedValue(
      recipient({ notificationSettings: settings({ quietHoursStart: NOW.getUTCHours() - 2, quietHoursEnd: NOW.getUTCHours() }) })
    );

    expect(await service.deliver(job)).toBe(2);
    expect(telegram.sendNotification).toHaveBeenCalledTimes(1);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('sends only the requested channels of a deferred job, ignoring quiet hours', async () => {
    const { service, prisma, telegram, queue } = createService();

    prisma.user.findUnique.mockResolvedValue(
      recipient({ notificationSettings: settings({ quietHoursStart: QUIET_START, quietHoursEnd: QUIET_END }) })
    );

    expect(await service.deliver({ ...job, onlyChannels: ['telegram'] })).toBe(1);
    expect(telegram.sendNotification).toHaveBeenCalledTimes(1);
    expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ channel: 'telegram' }) }));
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('leaves a channel another worker is sending to the retry instead of sending it twice', async () => {
    const { service, prisma, telegram } = createService();

    prisma.user.findUnique.mockResolvedValue(recipient({}));

    prisma.notification.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: PRISMA_CODE.uniqueViolation, clientVersion: 'test' })
    );

    await expect(service.deliver(job)).rejects.toThrow(/2 of 2/u);
    expect(telegram.sendNotification).not.toHaveBeenCalled();
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('rethrows a create failure that is not a unique violation', async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue(recipient({}));
    prisma.notification.create.mockRejectedValue(new Error('db down'));

    await expect(service.deliver(job)).rejects.toThrow(/2 of 2/u);
  });

  it('reuses the unsent row of a failed attempt instead of creating another', async () => {
    const { service, prisma, telegram } = createService();

    prisma.user.findUnique.mockResolvedValue(recipient({}));
    prisma.notification.findUnique.mockResolvedValue(mock<Notification>({ id: 'failed-row', sentAt: null }));

    expect(await service.deliver(job)).toBe(2);
    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(telegram.sendNotification).toHaveBeenCalledTimes(1);

    expect(prisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'failed-row' }, data: { sentAt: NOW, failedAt: null } })
    );
  });

  it('delivers nothing to a deleted user', async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue(null);

    expect(await service.deliver(job)).toBe(0);
  });
});

describe('DeliveryService.deliverDigest', () => {
  const digest = { userId: 'digest-user', weekKey: '2026-W39', digest: { battles: 10, wins: 5, damageDealt: 20_000, sessions: 2, marksGained: 1 } };

  it('sends a week only once', async () => {
    const { service, prisma, email, telegram } = createService();

    email.canReach.mockReturnValue(true);
    prisma.user.findUnique.mockResolvedValue(recipient({}));

    expect(await service.deliverDigest(digest)).toBe(2);
    expect(await service.deliverDigest(digest)).toBe(0);
    expect(email.sendNotification).toHaveBeenCalledTimes(1);
    expect(telegram.sendNotification).toHaveBeenCalledTimes(1);
  });

  it('sends nothing and claims no week when no digest channel is reachable', async () => {
    const { service, prisma, email, redis } = createService();

    email.canReach.mockReturnValue(false);
    prisma.user.findUnique.mockResolvedValue(recipient({ telegramId: null }));

    const unreachable = { ...digest, weekKey: '2026-W41' };

    expect(await service.deliverDigest(unreachable)).toBe(0);
    expect(email.sendNotification).not.toHaveBeenCalled();
    expect(await redis.keys(`${WEEKLY_DIGEST.dedupePrefix}${unreachable.userId}:${unreachable.weekKey}*`)).toEqual([]);
  });

  it('releases the week when sending fails so a retry can send it', async () => {
    const { service, prisma, email } = createService();

    email.canReach.mockReturnValue(true);
    email.sendNotification.mockRejectedValueOnce(new Error('smtp down'));
    prisma.user.findUnique.mockResolvedValue(recipient({ telegramId: null }));

    const retried = { ...digest, weekKey: '2026-W40' };

    await expect(service.deliverDigest(retried)).rejects.toThrow('smtp down');
    expect(await service.deliverDigest(retried)).toBe(1);
  });

  it('retries only the channel that failed', async () => {
    const { service, prisma, email, telegram } = createService();

    email.canReach.mockReturnValue(true);
    telegram.sendNotification.mockRejectedValueOnce(new Error('telegram down'));
    prisma.user.findUnique.mockResolvedValue(recipient({}));

    const retried = { ...digest, weekKey: '2026-W42' };

    await expect(service.deliverDigest(retried)).rejects.toThrow('telegram down');
    expect(await service.deliverDigest(retried)).toBe(1);
    expect(email.sendNotification).toHaveBeenCalledTimes(1);
    expect(telegram.sendNotification).toHaveBeenCalledTimes(2);
  });
});
