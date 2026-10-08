import { Injectable } from '@nestjs/common';

import type {
  CoachesQuery,
  CoachLookup,
  CoachOfferView,
  CoachPage,
  CoachView,
  CreateOfferRequest,
  UpdateOfferRequest,
  UpsertCoachRequest
} from '../coaching.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { paginate } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { AUTHOR_SELECT, CommunityAccountsReaderService } from '../../community-core';
import { toCoachView, toOfferView } from '../mappers/coaching-views.mappers';

@Injectable()
export class CoachProfileWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: CommunityAccountsReaderService
  ) {}

  async list({ tankId, limit, offset }: CoachesQuery): Promise<CoachPage> {
    const where = { isActive: true, hiddenAt: null, ...(tankId === undefined ? {} : { tankIds: { has: tankId } }) };
    const page = await paginate({
      limit,
      offset,
      fetch: (window) =>
        this.prisma.coachProfile.findMany({
          where,
          orderBy: [{ rating: { sort: 'desc', nulls: 'last' } }, { ordersDone: 'desc' }, { userId: 'asc' }],
          include: { user: { select: AUTHOR_SELECT }, offers: { where: { isActive: true } } },
          ...window
        }),
      count: () => this.prisma.coachProfile.count({ where })
    });

    const stats = await this.accounts.statsOf(page.items.map((row) => row.accountId));

    return { ...page, items: page.items.map((coach) => toCoachView({ coach, stats })) };
  }

  async get({ userId, viewerUserId }: CoachLookup): Promise<CoachView> {
    const isOwner = viewerUserId === userId;
    const coach = await this.prisma.coachProfile.findUnique({
      where: { userId },
      include: { user: { select: AUTHOR_SELECT }, offers: { where: isOwner ? {} : { isActive: true }, orderBy: { createdAt: 'asc' } } }
    });

    if (!coach || (!isOwner && (!coach.isActive || coach.hiddenAt !== null))) {
      throw new AppNotFoundException('NOT_FOUND', `No coach ${userId}`);
    }

    return toCoachView({ coach, stats: await this.accounts.statsOf([coach.accountId]) });
  }

  async upsertProfile({ userId, accountId, headline, bio, contacts, tankIds, isActive }: UpsertCoachRequest): Promise<CoachView> {
    const account = await this.accounts.accountOf({ userId, accountId });
    const data = {
      accountId: account,
      headline,
      bio: bio ?? null,
      contacts,
      tankIds,
      ...(isActive === undefined ? {} : { isActive })
    };

    await this.prisma.coachProfile.upsert({ where: { userId }, create: { userId, ...data }, update: data });

    return this.get({ userId, viewerUserId: userId });
  }

  async createOffer({ userId, title, description, durationMinutes, withReplay }: CreateOfferRequest): Promise<CoachOfferView> {
    await this.get({ userId, viewerUserId: userId });

    const offer = await this.prisma.coachingOffer.create({
      data: { coachUserId: userId, title, description: description ?? null, durationMinutes, withReplay }
    });

    return toOfferView(offer);
  }

  async updateOffer({ id, userId, ...changes }: UpdateOfferRequest): Promise<CoachOfferView> {
    const { count } = await this.prisma.coachingOffer.updateMany({ where: { id, coachUserId: userId }, data: changes });

    if (count === 0) {
      throw new AppNotFoundException('NOT_FOUND', `No offer ${id} of yours`);
    }

    return toOfferView(await this.prisma.coachingOffer.findUniqueOrThrow({ where: { id } }));
  }
}
