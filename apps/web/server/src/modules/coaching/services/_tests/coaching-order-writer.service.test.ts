import { describe, expect, it } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { CoachingOrder, CoachProfile } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { AppBadRequestException, AppNotFoundException } from '../../../../common/exceptions';
import { CoachingOrderWriterService } from '../coaching-order-writer.service';

const now = new Date('2026-09-25T12:00:00Z');

const order: CoachingOrder = {
  id: '88888888-8888-4888-8888-888888888888',
  coachUserId: 'coach',
  studentUserId: 'student',
  offerId: null,
  replayId: null,
  status: 'accepted',
  notes: null,
  studentContact: '@student',
  review: null,
  score: null,
  createdAt: now,
  completedAt: null
};

const coach: CoachProfile = {
  userId: 'coach',
  accountId: 7n,
  headline: 'Heavy tanks coach',
  bio: null,
  contacts: null,
  tankIds: [],
  isActive: true,
  rating: null,
  ordersDone: 0,
  hiddenAt: null,
  createdAt: now,
  updatedAt: now
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.coachingOrder.findUniqueOrThrow.mockResolvedValue(order);

  return { service: new CoachingOrderWriterService(prisma), prisma };
};

describe('CoachingOrderWriterService.order', () => {
  it('refuses to let a coach hire themselves', async () => {
    const { service, prisma } = createService();

    await expect(service.order({ userId: 'coach', coachUserId: 'coach', studentContact: '@coach' })).rejects.toBeInstanceOf(AppBadRequestException);
    expect(prisma.coachingOrder.create).not.toHaveBeenCalled();
  });

  it('records a request without an offer when none is chosen', async () => {
    const { service, prisma } = createService();

    prisma.coachProfile.findFirst.mockResolvedValue(coach);
    prisma.coachingOrder.create.mockResolvedValue({ ...order, status: 'requested' });

    await service.order({ userId: 'student', coachUserId: 'coach', studentContact: '@student' });

    expect(prisma.coachingOrder.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ offerId: null }) }));
  });

  it('refuses an offer that is not active for this coach', async () => {
    const { service, prisma } = createService();

    prisma.coachProfile.findFirst.mockResolvedValue(coach);
    prisma.coachingOffer.findFirst.mockResolvedValue(null);

    await expect(service.order({ userId: 'student', coachUserId: 'coach', offerId: 'offer', studentContact: '@student' })).rejects.toBeInstanceOf(
      AppNotFoundException
    );
  });
});

describe('CoachingOrderWriterService.order with a replay', () => {
  it('refuses a private replay of someone else', async () => {
    const { service, prisma } = createService();

    prisma.coachProfile.findFirst.mockResolvedValue(coach);
    prisma.replay.findFirst.mockResolvedValue(null);

    await expect(service.order({ userId: 'student', coachUserId: 'coach', replayId: 'r1', studentContact: '@student' })).rejects.toBeInstanceOf(
      AppNotFoundException
    );

    expect(prisma.replay.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'r1', OR: [{ uploaderUserId: 'student' }, { visibility: { not: 'private' } }] } })
    );

    expect(prisma.coachingOrder.create).not.toHaveBeenCalled();
  });

  it('never books a coach hidden by moderation', async () => {
    const { service, prisma } = createService();

    prisma.coachProfile.findFirst.mockResolvedValue(null);

    await expect(service.order({ userId: 'student', coachUserId: 'coach', studentContact: '@student' })).rejects.toBeInstanceOf(AppNotFoundException);

    expect(prisma.coachProfile.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'coach', isActive: true, hiddenAt: null } })
    );
  });
});

describe('CoachingOrderWriterService.review', () => {
  it('recomputes the coach rating from all scored orders', async () => {
    const { service, prisma } = createService();

    prisma.coachingOrder.findFirst.mockResolvedValue({ ...order, status: 'completed' });
    prisma.coachingOrder.update.mockResolvedValue({ ...order, status: 'completed', score: 5 });
    prisma.coachingOrder.aggregate.mockResolvedValue({ _avg: { score: 4.5 }, _count: {}, _max: {}, _min: {}, _sum: {} });

    await service.review({ id: order.id, userId: 'student', score: 5 });

    expect(prisma.coachingOrder.aggregate).toHaveBeenCalledWith(expect.objectContaining({ where: { coachUserId: 'coach', score: { not: null } } }));
    expect(prisma.coachProfile.update).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'coach' }, data: { rating: 4.5 } }));
  });

  it('refuses to review an order that is not completed', async () => {
    const { service, prisma } = createService();

    prisma.coachingOrder.findFirst.mockResolvedValue(null);

    await expect(service.review({ id: order.id, userId: 'student', score: 5 })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.coachProfile.update).not.toHaveBeenCalled();
  });
});

describe('CoachingOrderWriterService.complete', () => {
  it('completes an accepted order with no payment step', async () => {
    const { service, prisma } = createService();

    prisma.coachingOrder.updateMany.mockResolvedValue({ count: 1 });

    await service.complete({ id: order.id, userId: 'coach' });

    expect(prisma.coachingOrder.updateMany.mock.calls[0]?.[0].where).toMatchObject({ coachUserId: 'coach', status: 'accepted' });
  });
});
