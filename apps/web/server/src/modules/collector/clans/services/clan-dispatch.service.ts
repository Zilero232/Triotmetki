import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { chunk, unique } from 'remeda';

import type { ClanDispatchPayload, ClanRefreshPayload } from '../../contracts';

import { PrismaService } from '../../../../core';
import { chunkIds } from '../../../../lib/lesta';
import { JOB, QUEUE } from '../../contracts';
import { CLANS } from '../config/clans.constants';

@Injectable()
export class ClanDispatchService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE.clans) private readonly queue: Queue
  ) {}

  async dispatch({ scope }: ClanDispatchPayload): Promise<number> {
    const tracked = scope === 'tracked';
    const clanIds = tracked ? await this.trackedClanIds() : await this.allClanIds();

    if (tracked) {
      await this.markTracked(clanIds);
    }

    const jobs = chunkIds({ ids: clanIds }).map((part) => ({
      name: JOB.clans.refresh,
      data: { clanIds: part, snapshot: tracked } satisfies ClanRefreshPayload
    }));

    for (const part of chunk(jobs, CLANS.addBulkChunk)) {
      await this.queue.addBulk(part);
    }

    return clanIds.length;
  }

  private async markTracked(clanIds: readonly number[]) {
    const ids = clanIds.map(BigInt);

    await this.prisma.$transaction([
      this.prisma.clan.updateMany({ where: { isTracked: true, clanId: { notIn: ids } }, data: { isTracked: false } }),
      this.prisma.clan.updateMany({ where: { isTracked: false, clanId: { in: ids } }, data: { isTracked: true } })
    ]);
  }

  private async trackedClanIds(): Promise<number[]> {
    const [follows, workspaces, players] = await Promise.all([
      this.prisma.follow.groupBy({ by: ['targetId'], where: { kind: 'clan' } }),
      this.prisma.clanWorkspace.findMany({ select: { clanId: true } }),
      this.prisma.player.groupBy({ by: ['clanId'], where: { trackingTier: 'active', clanId: { not: null } } })
    ]);

    return unique([
      ...follows.map((follow) => Number(follow.targetId)),
      ...workspaces.map((workspace) => Number(workspace.clanId)),
      ...players.flatMap((player) => (player.clanId === null ? [] : [Number(player.clanId)]))
    ]);
  }

  private async allClanIds(): Promise<number[]> {
    const ids: number[] = [];
    let cursor = 0n;
    let pageSize = 0;

    do {
      const page = await this.prisma.clan.findMany({
        where: { isDisbanded: false, clanId: { gt: cursor } },
        orderBy: { clanId: 'asc' },
        select: { clanId: true },
        take: CLANS.dispatchPageSize
      });

      pageSize = page.length;
      cursor = page.at(-1)?.clanId ?? cursor;
      ids.push(...page.map((clan) => Number(clan.clanId)));
    } while (pageSize === CLANS.dispatchPageSize);

    return ids;
  }
}
