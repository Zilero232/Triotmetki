import type { PlayerComparison } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { ComparePlayersInput } from '../compare.types';

import { PrismaService } from '../../../core';
import { PlayerResolverService, PlayerSummaryReaderService } from '../../players';
import { commonTankIds } from '../lib';

@Injectable()
export class PlayerCompareService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: PlayerResolverService,
    private readonly summaries: PlayerSummaryReaderService
  ) {}

  async compare({ accountIds }: ComparePlayersInput): Promise<PlayerComparison> {
    const resolved = await Promise.all(accountIds.map((accountId) => this.resolver.ensure(BigInt(accountId))));
    const players = await Promise.all(resolved.map((accountId) => this.summaries.profile(accountId)));

    const tanks = await this.prisma.playerTank.findMany({
      where: { accountId: { in: resolved }, battles: { gt: 0 } },
      select: { accountId: true, tankId: true }
    });

    return { players, commonTankIds: commonTankIds({ tanks, accountCount: resolved.length }) };
  }
}
