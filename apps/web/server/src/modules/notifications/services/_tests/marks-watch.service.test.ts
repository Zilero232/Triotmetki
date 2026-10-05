import type { VehicleSummary } from '@otmetki/schemas';

import RedisMock from 'ioredis-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { Battle, Player, PlayerTank } from '../../../../../generated';
import type { VehicleCatalogService } from '../../../reference';
import type { MarksWatchQueries } from '../../queries/marks-watch.types';
import type { NotificationService } from '../notification.service';

import { mockPrismaService } from '../../../../core/prisma/_tests/prisma-mock';
import { MARKS_WATCH } from '../../config/watchers.constants';
import { MarksWatchService } from '../marks-watch.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const CURSOR = new Date(Date.UTC(2026, 8, 25)).toISOString();

const battle = ({ id, marks, minute }: { id: string; marks: number; minute: number }) =>
  mock<Battle>({
    id,
    accountId: 7n,
    tankId: 1,
    marksOnGun: marks,
    startedAt: new Date(Date.UTC(2026, 8, 25, 12, minute)),
    receivedAt: new Date(Date.UTC(2026, 8, 25, 12, minute, 30))
  });

const createService = () => {
  const prisma = mockPrismaService();
  const catalog = mock<VehicleCatalogService>();
  const notifications = mock<NotificationService>();
  const redis = new RedisMock();

  catalog.summary.mockResolvedValue(mock<VehicleSummary>({ name: 'T-34-85', shortName: 'T-34-85' }));
  prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: 7n, nickname: 'Tanker' })]);

  const queries = { previousBattleMarks: vi.fn<MarksWatchQueries['previousBattleMarks']>().mockResolvedValue([]) };

  return { service: new MarksWatchService(prisma, catalog, notifications, redis, queries), prisma, queries, notifications, redis };
};

describe('MarksWatchService', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts from now on the first run instead of replaying history', async () => {
    const { service, prisma, redis } = createService();

    expect(await service.run()).toBe(0);
    expect(await redis.get(MARKS_WATCH.cursorKey)).toBe(NOW.toISOString());
    expect(prisma.battle.findMany).not.toHaveBeenCalled();
  });

  it('announces a new mark to the account and moves the cursor past the batch', async () => {
    const { service, prisma, notifications, redis } = createService();
    const rows = [battle({ id: 'b1', marks: 1, minute: 0 }), battle({ id: 'b2', marks: 2, minute: 5 })];

    await redis.set(MARKS_WATCH.cursorKey, CURSOR);
    prisma.battle.findMany.mockResolvedValue(rows);
    prisma.playerTank.findMany.mockResolvedValue([mock<PlayerTank>({ accountId: 7n, tankId: 1, marksOnGun: 1 })]);

    expect(await service.run()).toBe(1);
    expect(notifications.notifyAccount).toHaveBeenCalledTimes(1);

    expect(notifications.notifyAccount).toHaveBeenCalledWith(
      expect.objectContaining({ accountId: 7n, dedupeKey: 'moe-b2', notification: expect.objectContaining({ event: 'moeGained', marks: 2 }) })
    );

    expect(await redis.get(MARKS_WATCH.cursorKey)).toBe(rows[1]?.receivedAt.toISOString());
  });

  it('keeps the cursor and announces nothing when no battle arrived', async () => {
    const { service, prisma, notifications, redis } = createService();

    await redis.set(MARKS_WATCH.cursorKey, CURSOR);
    prisma.battle.findMany.mockResolvedValue([]);

    expect(await service.run()).toBe(0);
    expect(notifications.notifyAccount).not.toHaveBeenCalled();
    expect(await redis.get(MARKS_WATCH.cursorKey)).toBe(CURSOR);
  });

  it('prefers the marks of the last earlier battle over the stored tank marks', async () => {
    const { service, prisma, queries, notifications, redis } = createService();

    await redis.set(MARKS_WATCH.cursorKey, CURSOR);
    prisma.battle.findMany.mockResolvedValue([battle({ id: 'b3', marks: 2, minute: 0 })]);
    queries.previousBattleMarks.mockResolvedValue([{ accountId: 7, tankId: 1, marksOnGun: 2 }]);
    prisma.playerTank.findMany.mockResolvedValue([mock<PlayerTank>({ accountId: 7n, tankId: 1, marksOnGun: 1 })]);

    expect(await service.run()).toBe(0);
    expect(notifications.notifyAccount).not.toHaveBeenCalled();
  });

  it('treats zero known marks as a baseline and announces the first mark', async () => {
    const { service, prisma, redis } = createService();

    await redis.set(MARKS_WATCH.cursorKey, CURSOR);
    prisma.battle.findMany.mockResolvedValue([battle({ id: 'b4', marks: 1, minute: 0 })]);
    prisma.playerTank.findMany.mockResolvedValue([mock<PlayerTank>({ accountId: 7n, tankId: 1, marksOnGun: 0 })]);

    expect(await service.run()).toBe(1);
  });

  it('announces nothing for a tank with no known marks at all', async () => {
    const { service, prisma, redis } = createService();

    await redis.set(MARKS_WATCH.cursorKey, CURSOR);
    prisma.battle.findMany.mockResolvedValue([battle({ id: 'b5', marks: 1, minute: 0 })]);
    prisma.playerTank.findMany.mockResolvedValue([]);

    expect(await service.run()).toBe(0);
  });

  it('finishes the battles that share the last timestamp of a full batch so the cursor skips none of them', async () => {
    const { service, prisma, notifications, redis } = createService();
    const tied = new Date(Date.UTC(2026, 8, 25, 13));
    const full = Array.from({ length: MARKS_WATCH.batchSize }, (_, index) =>
      mock<Battle>({ id: `f${index}`, accountId: 7n, tankId: 1, marksOnGun: 1, startedAt: tied, receivedAt: tied })
    );

    const late = mock<Battle>({ id: 'tie', accountId: 7n, tankId: 1, marksOnGun: 2, startedAt: new Date(tied.getTime() + 1), receivedAt: tied });

    await redis.set(MARKS_WATCH.cursorKey, CURSOR);
    prisma.battle.findMany.mockResolvedValueOnce(full).mockResolvedValueOnce([late]);
    prisma.playerTank.findMany.mockResolvedValue([mock<PlayerTank>({ accountId: 7n, tankId: 1, marksOnGun: 1 })]);

    await service.run();

    expect(notifications.notifyAccount).toHaveBeenCalledWith(expect.objectContaining({ dedupeKey: 'moe-tie' }));
  });
});
