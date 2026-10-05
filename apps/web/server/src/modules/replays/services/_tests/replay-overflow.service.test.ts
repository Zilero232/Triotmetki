import { addDays, subDays } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Replay, Subscription } from '../../../../../generated';
import type { ObjectStorage, PrismaService } from '../../../../core';
import type { NotificationService } from '../../../notifications';

import { REPLAY_OVERFLOW } from '../../config/overflow.constants';
import { ReplayOverflowService } from '../replay-overflow.service';

const periodEnd = new Date('2026-01-01T00:00:00Z');
const deleteAt = addDays(periodEnd, REPLAY_OVERFLOW.readOnlyDays);

const replays = Array.from({ length: REPLAY_OVERFLOW.keep + 2 }, (_, index) => ({
  id: `r${index}`,
  createdAt: addDays(periodEnd, index),
  storageKey: `replays/r${index}.mtreplay`,
  timelineKey: null
}));

const createService = (status: 'active' | 'expired') => {
  const prisma = mockDeep<PrismaService>();
  const storage = mock<ObjectStorage>();
  const notifications = mock<NotificationService>();

  Object.assign(prisma.replay, { groupBy: vi.fn().mockResolvedValue([{ uploaderUserId: 'u1', _count: { _all: replays.length } }]) });
  prisma.subscription.findMany.mockResolvedValue([mock<Subscription>({ userId: 'u1', status, currentPeriodEnd: periodEnd })]);
  prisma.replay.findMany.mockResolvedValue(replays.map((replay) => mock<Replay>(replay)));
  prisma.replay.deleteMany.mockResolvedValue({ count: 2 });

  return { service: new ReplayOverflowService(prisma, storage, notifications), prisma, storage, notifications };
};

describe('ReplayOverflowService.run', () => {
  it('deletes the oldest replays and their files once the read-only period is over', async () => {
    const { service, prisma, storage } = createService('expired');

    await expect(service.run(deleteAt)).resolves.toBe(2);

    expect(storage.remove.mock.calls.map(([key]) => key).toSorted()).toEqual(['replays/r0.mtreplay', 'replays/r1.mtreplay']);
    expect(prisma.replay.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: ['r1', 'r0'] }, uploaderUserId: 'u1' } }));
  });

  it('leaves the files alone when the row delete fails', async () => {
    const { service, prisma, storage } = createService('expired');

    prisma.replay.deleteMany.mockRejectedValue(new Error('db down'));

    await expect(service.run(deleteAt)).rejects.toThrow('db down');
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('still deletes the rows when a file removal fails', async () => {
    const { service, storage } = createService('expired');

    storage.remove.mockRejectedValueOnce(new Error('s3 down'));

    await expect(service.run(deleteAt)).resolves.toBe(2);
    expect(storage.remove).toHaveBeenCalledTimes(2);
  });

  it('warns 14 days ahead with an idempotent key and deletes nothing', async () => {
    const { service, prisma, notifications } = createService('expired');

    await service.run(subDays(deleteAt, 10));

    expect(notifications.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        notification: expect.objectContaining({ event: 'replayOverflow', daysLeft: 14, keep: REPLAY_OVERFLOW.keep }),
        dedupeKey: `${REPLAY_OVERFLOW.dedupePrefix}-2026-06-30-14`
      })
    );

    expect(prisma.replay.deleteMany).not.toHaveBeenCalled();
  });

  it('leaves a subscriber with an active Plus alone', async () => {
    const { service, prisma, notifications } = createService('active');

    await service.run(subDays(periodEnd, 1));

    expect(notifications.notify).not.toHaveBeenCalled();
    expect(prisma.replay.deleteMany).not.toHaveBeenCalled();
  });
});
