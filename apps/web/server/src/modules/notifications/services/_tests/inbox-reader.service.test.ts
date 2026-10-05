import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Notification } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { InboxReaderService } from '../inbox-reader.service';

const NOW = new Date('2026-09-26T12:00:00.000Z');
const CREATED_AT = new Date('2026-09-25T12:00:00.000Z');

const row = (overrides: Partial<Notification>): Notification =>
  mock<Notification>({ id: 'n1', event: 'moeGained', createdAt: CREATED_AT, readAt: null, payload: {}, ...overrides });

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.notification.findMany.mockResolvedValue([]);
  prisma.notification.count.mockResolvedValue(0);
  prisma.notification.updateMany.mockResolvedValue({ count: 0 });

  return { service: new InboxReaderService(prisma), prisma };
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('InboxReaderService.list', () => {
  it('reads the title, body and link from the stored payload', async () => {
    const { service, prisma } = createService();

    prisma.notification.findMany.mockResolvedValue([row({ payload: { title: 'Mark', body: 'Gained', url: 'https://x.test/t/1' } })]);
    prisma.notification.count.mockResolvedValue(1);

    const page = await service.list({ userId: 'u', limit: 20 });

    expect(page.unread).toBe(1);
    expect(page.items[0]).toMatchObject({ title: 'Mark', body: 'Gained', url: 'https://x.test/t/1', readAt: null });
  });

  it('turns missing or non-string payload fields into empty text and a null link', async () => {
    const { service, prisma } = createService();

    prisma.notification.findMany.mockResolvedValue([row({ payload: { title: 42, url: '' } }), row({ id: 'n2', payload: null })]);

    const { items } = await service.list({ userId: 'u', limit: 20 });

    expect(items.map((item) => [item.title, item.body, item.url])).toEqual([
      ['', '', null],
      ['', '', null]
    ]);
  });

  it('pages older items with the before cursor', async () => {
    const { service, prisma } = createService();
    const before = '2026-09-20T00:00:00.000Z';

    await service.list({ userId: 'u', limit: 20, before });

    expect(prisma.notification.findMany.mock.calls[0]?.[0]?.where).toMatchObject({ createdAt: { lt: new Date(before) } });
  });
});

describe('InboxReaderService.markRead', () => {
  it('marks only unread site notifications of the user as read now', async () => {
    const { service, prisma } = createService();

    prisma.notification.updateMany.mockResolvedValue({ count: 2 });

    await expect(service.markRead({ userId: 'u', ids: ['n1', 'n2'] })).resolves.toBe(2);

    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u', channel: 'site', readAt: null, id: { in: ['n1', 'n2'] } },
        data: { readAt: NOW }
      })
    );
  });

  it('marks everything read when no ids are given', async () => {
    const { service, prisma } = createService();

    await service.markRead({ userId: 'u' });

    expect(prisma.notification.updateMany.mock.calls[0]?.[0]?.where).not.toHaveProperty('id');
  });
});
