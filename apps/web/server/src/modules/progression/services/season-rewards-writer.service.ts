import { Injectable } from '@nestjs/common';
import { seasonLevelOf, seasonOf } from '@otmetki/schemas';

import type { UserAtInput } from '../progression.types';

import { PrismaService } from '../../../core';
import { seasonRewardKey } from '../lib/ledger-keys/ledger-keys';
import { earnedRewards } from '../lib/season-rewards/season-rewards';
import { ShellLedgerWriterService } from './shell-ledger-writer.service';

@Injectable()
export class SeasonRewardsWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: ShellLedgerWriterService
  ) {}

  async claimRewards({ userId, now }: UserAtInput): Promise<number> {
    const season = seasonOf(now).code;
    const row = await this.prisma.seasonProgress.findUnique({ where: { userId_season: { userId, season } }, select: { points: true } });
    const rewards = earnedRewards({ season, level: seasonLevelOf(row?.points ?? 0).level });
    let claimed = 0;

    for (const reward of rewards) {
      if (reward.kind === 'shells') {
        const granted = await this.ledger.grant({
          userId,
          amount: reward.amount,
          reason: 'season',
          key: seasonRewardKey({ userId, season, level: reward.level }),
          points: 0,
          now,
          context: { season, level: reward.level }
        });

        claimed += granted ? 1 : 0;

        continue;
      }

      const created = await this.prisma.cosmeticOwnership.createMany({
        data: [{ userId, code: reward.code, grant: 'season', acquiredAt: now }],
        skipDuplicates: true
      });

      claimed += created.count;
    }

    return claimed;
  }
}
