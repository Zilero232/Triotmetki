import { Injectable } from '@nestjs/common';

import type { OwnedById } from '../../community-core';
import type { CoachingOrderView, CreateOrderRequest, OrderTransition, ReviewOrderRequest } from '../coaching.types';

import { AppBadRequestException, AppForbiddenException, AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { COACHING } from '../config/coaching.constants';
import { toOrderView } from '../mappers/coaching-views.mappers';

@Injectable()
export class CoachingOrderWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async orders(userId: string): Promise<CoachingOrderView[]> {
    const rows = await this.prisma.coachingOrder.findMany({
      where: { OR: [{ coachUserId: userId }, { studentUserId: userId }] },
      orderBy: { createdAt: 'desc' },
      take: COACHING.ordersLimit
    });

    return rows.map((order) => toOrderView({ order, viewerId: userId }));
  }

  async order({ userId, coachUserId, offerId, replayId, notes, studentContact }: CreateOrderRequest): Promise<CoachingOrderView> {
    if (coachUserId === userId) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'You cannot hire yourself');
    }

    const coach = await this.prisma.coachProfile.findFirst({ where: { userId: coachUserId, isActive: true, hiddenAt: null } });

    if (!coach) {
      throw new AppNotFoundException('NOT_FOUND', `No active coach ${coachUserId}`);
    }

    const offer = offerId ? await this.prisma.coachingOffer.findFirst({ where: { id: offerId, coachUserId, isActive: true } }) : null;

    if (offerId && !offer) {
      throw new AppNotFoundException('NOT_FOUND', `No active offer ${offerId}`);
    }

    if (replayId) {
      const replay = await this.prisma.replay.findFirst({
        where: { id: replayId, OR: [{ uploaderUserId: userId }, { visibility: { not: 'private' } }] },
        select: { id: true }
      });

      if (!replay) {
        throw new AppNotFoundException('NOT_FOUND', `No replay ${replayId} you can attach`);
      }
    }

    const order = await this.prisma.coachingOrder.create({
      data: {
        coachUserId,
        studentUserId: userId,
        offerId: offer?.id ?? null,
        replayId: replayId ?? null,
        notes: notes ?? null,
        studentContact
      }
    });

    return toOrderView({ order, viewerId: userId });
  }

  async accept({ id, userId }: OwnedById): Promise<CoachingOrderView> {
    return this.transition({ id, userId, where: { coachUserId: userId, status: 'requested' }, status: 'accepted' });
  }

  async cancel({ id, userId }: OwnedById): Promise<CoachingOrderView> {
    return this.transition({
      id,
      userId,
      where: { OR: [{ coachUserId: userId }, { studentUserId: userId }], status: { in: ['requested', 'accepted'] } },
      status: 'cancelled'
    });
  }

  async complete({ id, userId }: OwnedById): Promise<CoachingOrderView> {
    const order = await this.transition({
      id,
      userId,
      where: { coachUserId: userId, status: 'accepted' },
      status: 'completed',
      completedAt: new Date()
    });

    await this.prisma.coachProfile.update({ where: { userId }, data: { ordersDone: { increment: 1 } } });

    return order;
  }

  async review({ id, userId, score, review }: ReviewOrderRequest): Promise<CoachingOrderView> {
    const order = await this.prisma.coachingOrder.findFirst({ where: { id, studentUserId: userId, status: 'completed' } });

    if (!order) {
      throw new AppNotFoundException('NOT_FOUND', `No completed order ${id} of yours`);
    }

    const updated = await this.prisma.coachingOrder.update({ where: { id }, data: { score, review: review ?? null } });
    const average = await this.prisma.coachingOrder.aggregate({
      where: { coachUserId: order.coachUserId, score: { not: null } },
      _avg: { score: true }
    });

    await this.prisma.coachProfile.update({ where: { userId: order.coachUserId }, data: { rating: average._avg.score } });

    return toOrderView({ order: updated, viewerId: userId });
  }

  private async transition({ id, userId, where, status, completedAt }: OrderTransition): Promise<CoachingOrderView> {
    const { count } = await this.prisma.coachingOrder.updateMany({
      where: { id, ...where },
      data: { status, ...(completedAt ? { completedAt } : {}) }
    });

    if (count === 0) {
      throw new AppForbiddenException('FORBIDDEN', `Order ${id} cannot move to ${status}`);
    }

    return toOrderView({ order: await this.prisma.coachingOrder.findUniqueOrThrow({ where: { id } }), viewerId: userId });
  }
}
