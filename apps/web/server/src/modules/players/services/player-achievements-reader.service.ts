import type { PlayerAchievements } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';

import type { LestaClient } from '../../../lib/lesta';

import { LESTA_CLIENT, PrismaService } from '../../../core';
import { accountAchievementsSchema } from '../../../lib/lesta';
import { PLAYER_ACHIEVEMENTS } from '../config';
import { playerAchievements } from '../lib';

@Injectable()
export class PlayerAchievementsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENT) private readonly lesta: LestaClient
  ) {}

  async achievements(accountId: bigint): Promise<PlayerAchievements> {
    const key = accountId.toString();

    const [byAccount, catalog] = await Promise.all([
      this.lesta.account.achievements({ accountIds: [key], fields: PLAYER_ACHIEVEMENTS.fields }),
      this.prisma.achievement.findMany({
        select: { name: true, section: true, title: true, titleEn: true, description: true, descriptionEn: true, image: true, order: true }
      })
    ]);

    const entry = accountAchievementsSchema.safeParse(byAccount[key]);

    return { items: entry.success ? playerAchievements({ counts: entry.data.achievements, maxSeries: entry.data.max_series, catalog }) : [] };
  }
}
