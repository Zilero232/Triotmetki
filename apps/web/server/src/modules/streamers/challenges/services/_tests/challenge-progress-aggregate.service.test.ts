import { addMinutes } from 'date-fns';
import RedisMock from 'ioredis-mock';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Battle, Challenge } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';
import type { NotificationService } from '../../../../notifications';
import type { CatalogEntry } from '../../../../reference/reference.types';
import type { ChatAnnouncerService, ChatReplyReaderService } from '../../../chat';
import type { OverlayPublisherService } from '../../../overlays';

import { Prisma, VehicleType } from '../../../../../../generated';
import { VehicleCatalogService } from '../../../../reference';
import { CHAT_COPY } from '../../../chat';
import { CHALLENGE } from '../../config/challenge.constants';
import { ChallengeProgressAggregateService } from '../challenge-progress-aggregate.service';

const NOW = new Date(Date.UTC(2026, 8, 25, 13));

const CURSOR = new Date(Date.UTC(2026, 8, 25, 12)).toISOString();

const challenge: Challenge = {
  ...mock<Challenge>({ id: 'c1', streamerUserId: 's1', accountId: 7n, title: '3000 on LT', status: 'active' }),
  amount: new Prisma.Decimal(500),
  condition: { metric: 'damage', value: 3000, battles: 2, tankType: 'lightTank' },
  progress: { battles: 0, value: 0, battleIds: [], durationMinutes: 60 },
  acceptedAt: new Date(Date.UTC(2026, 8, 25, 12)),
  createdAt: new Date(Date.UTC(2026, 8, 25, 11))
};

const battle = ({ id, damageDealt }: { id: string; damageDealt: number }) =>
  mock<Battle>({
    id,
    tankId: 1,
    startedAt: new Date(Date.UTC(2026, 8, 25, 12, 5)),
    result: 'win',
    damageDealt,
    damageAssistedRadio: 0,
    damageAssistedTrack: 0,
    damageBlocked: 0,
    frags: 0,
    spotted: 0,
    xp: 0,
    survived: true,
    moePercent: null
  });

const lightTank = mock<CatalogEntry>({ summary: { tankId: 1, type: 'lightTank', tier: 10 }, dbType: VehicleType.lightTank });

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();
  const publisher = mock<OverlayPublisherService>();
  const announcer = mock<ChatAnnouncerService>();
  const stats = mock<ChatReplyReaderService>();
  const notifications = mock<NotificationService>();

  catalog.find.mockResolvedValue(lightTank);
  stats.text.mockResolvedValue('announcement');

  const redis = new RedisMock();
  const service = new ChallengeProgressAggregateService(prisma, catalog, publisher, announcer, stats, notifications, redis);

  return { service, prisma, catalog, publisher, announcer, stats, notifications, redis };
};

describe('ChallengeProgressAggregateService.evaluate', () => {
  it('saves progress while the challenge is still running', async () => {
    const { service, prisma, announcer } = createService();

    prisma.battle.findMany.mockResolvedValue([battle({ id: 'b1', damageDealt: 1200 })]);

    expect(await service.evaluate({ challenge, now: NOW })).toBe(false);

    expect(prisma.challenge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1' },
        data: { progress: expect.objectContaining({ battles: 1, value: 1200, durationMinutes: 60 }) }
      })
    );

    expect(announcer.announce).not.toHaveBeenCalled();
  });

  it('resolves a met challenge once and tells the chat, the overlay and the streamer', async () => {
    const { service, prisma, announcer, publisher, notifications } = createService();

    prisma.battle.findMany.mockResolvedValue([battle({ id: 'b1', damageDealt: 3500 })]);
    prisma.challenge.updateMany.mockResolvedValue({ count: 1 });

    expect(await service.evaluate({ challenge, now: NOW })).toBe(true);

    expect(prisma.challenge.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1', status: 'active' }, data: expect.objectContaining({ status: 'succeeded', battleId: 'b1' }) })
    );

    expect(announcer.announce).toHaveBeenCalledWith({ streamerUserId: 's1', text: 'announcement' });
    expect(publisher.publish).toHaveBeenCalledWith(7n);

    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 's1',
        dedupeKey: 'challenge-c1',
        notification: expect.objectContaining({ event: 'challengeResolved', isSucceeded: true })
      })
    );
  });

  it('does not announce twice when another run resolved it first', async () => {
    const { service, prisma, announcer } = createService();

    prisma.battle.findMany.mockResolvedValue([battle({ id: 'b1', damageDealt: 3500 })]);
    prisma.challenge.updateMany.mockResolvedValue({ count: 0 });

    expect(await service.evaluate({ challenge, now: NOW })).toBe(false);
    expect(announcer.announce).not.toHaveBeenCalled();
  });

  it('fails a challenge whose battles all fell short and tells the streamer', async () => {
    const { service, prisma, stats, notifications } = createService();

    prisma.battle.findMany.mockResolvedValue([battle({ id: 'b1', damageDealt: 1200 }), battle({ id: 'b2', damageDealt: 900 })]);
    prisma.challenge.updateMany.mockResolvedValue({ count: 1 });

    expect(await service.evaluate({ challenge, now: NOW })).toBe(true);

    expect(prisma.challenge.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'failed', resolvedAt: NOW, battleId: 'b2' }) })
    );

    expect(stats.text).toHaveBeenCalledWith(expect.objectContaining({ message: CHAT_COPY.messages.challengeFailed }));
    expect(notifications.notify).toHaveBeenCalledWith(expect.objectContaining({ notification: expect.objectContaining({ isSucceeded: false }) }));
  });

  it('does not count a battle on a tank the catalog does not know', async () => {
    const { service, prisma, catalog } = createService();

    catalog.find.mockResolvedValue(null);
    prisma.battle.findMany.mockResolvedValue([battle({ id: 'b1', damageDealt: 3500 })]);

    expect(await service.evaluate({ challenge, now: NOW })).toBe(false);
    expect(prisma.challenge.update).toHaveBeenCalledWith(expect.objectContaining({ data: { progress: expect.objectContaining({ battles: 0 }) } }));
  });

  it('skips a challenge with an unreadable condition', async () => {
    const { service, prisma } = createService();

    expect(await service.evaluate({ challenge: { ...challenge, condition: { metric: 'unknown' } }, now: NOW })).toBe(false);
    expect(prisma.battle.findMany).not.toHaveBeenCalled();
    expect(prisma.challenge.updateMany).not.toHaveBeenCalled();
  });
});

describe('ChallengeProgressAggregateService.run', () => {
  it('starts from now on the first run instead of replaying history', async () => {
    const { service, prisma, redis } = createService();

    expect(await service.run(NOW)).toBe(0);
    expect(await redis.get(CHALLENGE.feedCursorKey)).toBe(NOW.toISOString());
    expect(prisma.battle.findMany).not.toHaveBeenCalled();
  });

  it('keeps the cursor when no battle arrived', async () => {
    const { service, prisma, publisher, redis } = createService();

    await redis.set(CHALLENGE.feedCursorKey, CURSOR);
    prisma.battle.findMany.mockResolvedValue([]);

    expect(await service.run(NOW)).toBe(0);
    expect(publisher.publish).not.toHaveBeenCalled();
    expect(await redis.get(CHALLENGE.feedCursorKey)).toBe(CURSOR);
  });

  it('refreshes the overlays of the batch, resolves the met challenges and moves the cursor past the batch', async () => {
    const { service, prisma, publisher, redis } = createService();
    const lastReceived = new Date(Date.UTC(2026, 8, 25, 12, 10));

    await redis.set(CHALLENGE.feedCursorKey, CURSOR);

    prisma.battle.findMany
      .mockResolvedValueOnce([
        mock<Battle>({ accountId: 7n, receivedAt: new Date(Date.UTC(2026, 8, 25, 12, 5)) }),
        mock<Battle>({ accountId: 7n, receivedAt: lastReceived })
      ])
      .mockResolvedValueOnce([battle({ id: 'b1', damageDealt: 3500 })]);

    prisma.challenge.findMany.mockResolvedValue([challenge]);
    prisma.challenge.updateMany.mockResolvedValue({ count: 1 });

    expect(await service.run(NOW)).toBe(1);
    expect(publisher.publish).toHaveBeenNthCalledWith(1, 7n);
    expect(await redis.get(CHALLENGE.feedCursorKey)).toBe(lastReceived.toISOString());
  });

  it('reads the battles received after the cursor, oldest first, one batch at a time', async () => {
    const { service, prisma, redis } = createService();

    await redis.set(CHALLENGE.feedCursorKey, CURSOR);
    prisma.battle.findMany.mockResolvedValue([]);

    await service.run(NOW);

    expect(prisma.battle.findMany).toHaveBeenCalledWith({
      where: { receivedAt: { gt: new Date(CURSOR) } },
      orderBy: { receivedAt: 'asc' },
      take: CHALLENGE.feedBatch,
      select: { accountId: true, receivedAt: true }
    });
  });

  it('only looks at active challenges of the accounts in the batch', async () => {
    const { service, prisma, redis } = createService();

    await redis.set(CHALLENGE.feedCursorKey, CURSOR);

    prisma.battle.findMany.mockResolvedValue([
      mock<Battle>({ accountId: 7n, receivedAt: new Date(Date.UTC(2026, 8, 25, 12, 5)) }),
      mock<Battle>({ accountId: 8n, receivedAt: new Date(Date.UTC(2026, 8, 25, 12, 6)) }),
      mock<Battle>({ accountId: 7n, receivedAt: new Date(Date.UTC(2026, 8, 25, 12, 7)) })
    ]);

    prisma.challenge.findMany.mockResolvedValue([]);

    await service.run(NOW);

    expect(prisma.challenge.findMany).toHaveBeenCalledWith({ where: { status: 'active', accountId: { in: [7n, 8n] } } });
  });

  it('keeps the cursor when processing the batch fails, so the batch is retried', async () => {
    const { service, prisma, publisher, redis } = createService();

    await redis.set(CHALLENGE.feedCursorKey, CURSOR);
    prisma.battle.findMany.mockResolvedValue([mock<Battle>({ accountId: 7n, receivedAt: new Date(Date.UTC(2026, 8, 25, 12, 5)) })]);
    publisher.publish.mockRejectedValue(new Error('redis down'));

    await expect(service.run(NOW)).rejects.toThrow('redis down');
    expect(await redis.get(CHALLENGE.feedCursorKey)).toBe(CURSOR);
  });
});

describe('ChallengeProgressAggregateService.expire', () => {
  it('expires an overdue challenge and tells the chat and the overlay', async () => {
    const { service, prisma, announcer, publisher, stats } = createService();

    prisma.challenge.findMany.mockResolvedValue([{ ...challenge, expiresAt: addMinutes(NOW, -1) }]);
    prisma.challenge.updateMany.mockResolvedValue({ count: 1 });

    expect(await service.expire(NOW)).toBe(1);

    expect(prisma.challenge.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'c1', status: 'active' }, data: { status: 'expired', resolvedAt: NOW } })
    );

    expect(stats.text).toHaveBeenCalledWith(expect.objectContaining({ message: CHAT_COPY.messages.challengeExpired }));
    expect(announcer.announce).toHaveBeenCalledWith({ streamerUserId: 's1', text: 'announcement' });
    expect(publisher.publish).toHaveBeenCalledWith(7n);
  });

  it('does not announce a challenge another run resolved first', async () => {
    const { service, prisma, announcer } = createService();

    prisma.challenge.findMany.mockResolvedValue([challenge]);
    prisma.challenge.updateMany.mockResolvedValue({ count: 0 });

    expect(await service.expire(NOW)).toBe(0);
    expect(announcer.announce).not.toHaveBeenCalled();
  });
});
