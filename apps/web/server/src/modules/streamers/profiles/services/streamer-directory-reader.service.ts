import type { StreamerCard, StreamerDirectory } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';
import { streamerCardSchema } from '@otmetki/schemas';
import { Redis } from 'ioredis';
import { z } from 'zod';

import type { StreamerDirectoryQueryView } from '../profiles.types';

import { Prisma } from '../../../../../generated';
import { parseJsonText } from '../../../../common/lib';
import { PrismaService, REDIS } from '../../../../core';
import { STREAMERS } from '../config/directory.constants';
import { PROFILE_CARD_INCLUDE } from '../selects/profile-card.selects';
import { StreamerCardsReaderService } from './streamer-cards-reader.service';

@Injectable()
export class StreamerDirectoryReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cards: StreamerCardsReaderService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}

  async list({ live, platform, tankId, hasSettings, kind, cursor, limit }: StreamerDirectoryQueryView): Promise<StreamerDirectory> {
    const where: Prisma.StreamerProfileWhereInput = {
      hiddenAt: null,
      kind: STREAMERS.editorialEnabled ? kind : 'claimed',
      ...(live ? { isLive: true } : {}),
      ...(platform ? { channels: { some: { platform } } } : {}),
      ...(tankId ? { liveTankId: tankId } : {}),
      ...(hasSettings === undefined ? {} : { settings: hasSettings ? { not: Prisma.DbNull } : { equals: Prisma.DbNull } })
    };

    const profiles = await this.prisma.streamerProfile.findMany({
      where,
      include: PROFILE_CARD_INCLUDE,
      orderBy: [{ isLive: 'desc' }, { liveViewers: { sort: 'desc', nulls: 'last' } }, { createdAt: 'asc' }],
      skip: cursor,
      take: limit + 1
    });

    const page = profiles.slice(0, limit);

    return {
      items: await this.cards.cards(page),
      nextCursor: profiles.length > limit ? cursor + limit : null,
      editorialEnabled: STREAMERS.editorialEnabled
    };
  }

  async live(): Promise<StreamerCard[]> {
    const key = `${STREAMERS.cachePrefix}live`;
    const cached = await this.redis.get(key);

    if (cached) {
      const parsed = z.array(streamerCardSchema).safeParse(parseJsonText(cached));

      if (parsed.success) {
        return parsed.data;
      }
    }

    const profiles = await this.prisma.streamerProfile.findMany({
      where: { hiddenAt: null, isLive: true, ...(STREAMERS.editorialEnabled ? {} : { kind: 'claimed' }) },
      include: PROFILE_CARD_INCLUDE,
      orderBy: { liveViewers: { sort: 'desc', nulls: 'last' } }
    });

    const cards = await this.cards.cards(profiles);

    await this.redis.set(key, JSON.stringify(cards), 'EX', STREAMERS.liveCacheSeconds);

    return cards;
  }
}
