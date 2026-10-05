import { subMilliseconds } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Notification } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { SendOnceInput } from '../../notifications.types';

import { Prisma } from '../../../../../generated';
import { PRISMA_CODE } from '../../../../core/prisma/prisma.constants';
import { NOTIFICATION_LEDGER } from '../../config/delivery.constants';
import { NotificationLedgerService } from '../notification-ledger.service';

const NOW = new Date('2026-09-28T12:00:00Z');

const INPUT: Omit<SendOnceInput, 'send'> = {
  userId: 'user-1',
  channel: 'telegram',
  dedupeKey: 'session-1',
  notification: { event: 'goalReached', goalId: 'goal-1', metric: 'battles', target: 10 },
  rendered: { title: 'Goal', body: 'Reached', url: 'https://triotmetki.ru/me/goals' }
};

const createLedger = () => {
  const prisma = mockDeep<PrismaService>();
  const send = vi.fn(async () => undefined);

  prisma.notification.findUnique.mockResolvedValue(null);
  prisma.notification.create.mockResolvedValue(mock<Notification>({ id: 'n1' }));
  prisma.notification.updateMany.mockResolvedValue({ count: 1 });

  return { ledger: new NotificationLedgerService(prisma), prisma, send };
};

describe('NotificationLedgerService.sendOnce', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('claims a new row, sends and records the delivery', async () => {
    const { ledger, prisma, send } = createLedger();

    await expect(ledger.sendOnce({ ...INPUT, send })).resolves.toBe(true);

    expect(prisma.notification.create.mock.calls[0]?.[0].data).toMatchObject({ claimedAt: NOW, dedupeKey: INPUT.dedupeKey });
    expect(send).toHaveBeenCalledTimes(1);
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { sentAt: NOW, failedAt: null } });
  });

  it('does not send what another sender already delivered', async () => {
    const { ledger, prisma, send } = createLedger();

    prisma.notification.findUnique.mockResolvedValue(mock<Notification>({ id: 'n1', sentAt: NOW }));

    await expect(ledger.sendOnce({ ...INPUT, send })).resolves.toBe(false);
    expect(send).not.toHaveBeenCalled();
  });

  it('does not send while another sender holds an unexpired claim, and fails so the job checks again later', async () => {
    const { ledger, prisma, send } = createLedger();

    prisma.notification.findUnique.mockResolvedValue(mock<Notification>({ id: 'n1', sentAt: null }));
    prisma.notification.updateMany.mockResolvedValue({ count: 0 });

    await expect(ledger.sendOnce({ ...INPUT, send })).rejects.toThrow(/in flight/u);
    expect(send).not.toHaveBeenCalled();
  });

  it('takes over an unsent row only when it is unclaimed or its claim is older than the lease', async () => {
    const { ledger, prisma, send } = createLedger();

    prisma.notification.findUnique.mockResolvedValue(mock<Notification>({ id: 'n1', sentAt: null }));

    await expect(ledger.sendOnce({ ...INPUT, send })).resolves.toBe(true);

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'n1',
        sentAt: null,
        OR: [{ claimedAt: null }, { claimedAt: { lt: subMilliseconds(NOW, NOTIFICATION_LEDGER.claimLeaseMs) } }]
      },
      data: { claimedAt: NOW, failedAt: null }
    });

    expect(prisma.notification.create).not.toHaveBeenCalled();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('does not send when a concurrent sender created the row first', async () => {
    const { ledger, prisma, send } = createLedger();

    prisma.notification.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: PRISMA_CODE.uniqueViolation, clientVersion: 'test' })
    );

    await expect(ledger.sendOnce({ ...INPUT, send })).rejects.toThrow(/in flight/u);
    expect(send).not.toHaveBeenCalled();
  });

  it('releases the claim of a failed send so the retry can take it at once, and rethrows', async () => {
    const { ledger, prisma, send } = createLedger();

    send.mockRejectedValue(new Error('blocked'));

    await expect(ledger.sendOnce({ ...INPUT, send })).rejects.toThrow('blocked');
    expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: { failedAt: NOW, claimedAt: null } });
  });

  it('never marks a delivered notification as failed when recording the delivery fails', async () => {
    const { ledger, prisma, send } = createLedger();

    prisma.notification.update.mockRejectedValue(new Error('db down'));

    await expect(ledger.sendOnce({ ...INPUT, send })).rejects.toThrow('db down');
    expect(prisma.notification.update).toHaveBeenCalledTimes(1);
    expect(prisma.notification.update.mock.calls[0]?.[0].data).toHaveProperty('sentAt');
  });
});
