import type { PlayerActivity, PlayerHistoryEntry, TimeSeries } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { sortBy } from 'remeda';

import type { HistoryWindowPolicy } from '../lib';
import type { ActivityInput, HistoryInput, HistoryPolicyInput } from '../players.types';
import type { PlayerQueries } from '../providers/player-queries.provider.types';

import { moscowDay, moscowDayStart, percentOf } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { BronyaReferencesReaderService, ExpectedValuesReaderService, VehicleCatalogService } from '../../reference';
import { HISTORY_WINDOW, PLAYER_QUERIES } from '../config';
import { historyWindow, seriesPoints } from '../lib';
import { toClanHistoryEntry, toNicknameHistoryEntry } from '../mappers';

@Injectable()
export class PlayerHistoryReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly expected: ExpectedValuesReaderService,
    private readonly bronya: BronyaReferencesReaderService,
    private readonly entitlements: EntitlementsService,
    @Inject(PLAYER_QUERIES) private readonly queries: PlayerQueries
  ) {}

  async policyFor({ accountId, viewerUserId }: HistoryPolicyInput): Promise<HistoryWindowPolicy> {
    if (!viewerUserId) {
      return HISTORY_WINDOW.free;
    }

    const link = await this.prisma.userLestaAccount.findUnique({ where: { accountId }, select: { userId: true } });

    if (link?.userId !== viewerUserId || !(await this.entitlements.isPlus(viewerUserId))) {
      return HISTORY_WINDOW.free;
    }

    return HISTORY_WINDOW.full;
  }

  async series({ accountId, query, policy }: HistoryInput): Promise<TimeSeries> {
    const { from, to } = historyWindow({ from: query.from, to: query.to, now: new Date(), policy });

    const [rows, expected, tiers, patches, references] = await Promise.all([
      this.queries.tankDeltaBuckets({ db: this.prisma.$kysely, accountId: Number(accountId), granularity: query.granularity, from, to }),
      this.expected.all(),
      this.catalog.tiers(),
      this.prisma.gameVersion.findMany({ where: { releasedAt: { gte: from, lt: to } }, orderBy: { releasedAt: 'asc' } }),
      query.metric === 'broneIndex' ? this.bronya.all() : Promise.resolve(new Map())
    ]);

    return {
      metric: query.metric,
      granularity: query.granularity,
      points: seriesPoints({ rows, metric: query.metric, expected, tiers, references }),
      markers: patches.flatMap((patch) =>
        patch.releasedAt ? [{ at: patch.releasedAt.toISOString(), kind: 'patch' as const, label: patch.title ?? patch.version }] : []
      )
    };
  }

  async activity({ accountId, days }: ActivityInput): Promise<PlayerActivity> {
    const to = new Date();
    const from = moscowDayStart(subDays(to, days - 1));

    const rows = await this.queries.activityDays({ db: this.prisma.$kysely, accountId: Number(accountId), from });

    return {
      from: moscowDay(from),
      to: moscowDay(to),
      days: rows.map((row) => ({ date: row.day, battles: row.battles, winRate: percentOf({ value: row.wins, by: row.battles }) }))
    };
  }

  async nicknames(accountId: bigint): Promise<PlayerHistoryEntry[]> {
    const [nicknames, clans] = await Promise.all([
      this.prisma.playerNickname.findMany({ where: { accountId }, orderBy: { firstSeenAt: 'desc' } }),
      this.prisma.playerClanHistory.findMany({ where: { accountId }, orderBy: { joinedAt: 'desc' } })
    ]);

    const tags = await this.prisma.clan.findMany({
      where: { clanId: { in: clans.map((entry) => entry.clanId) } },
      select: { clanId: true, tag: true }
    });

    const tagOf = new Map(tags.map((clan) => [clan.clanId, clan.tag]));

    const entries: PlayerHistoryEntry[] = [
      ...nicknames.map(toNicknameHistoryEntry),
      ...clans.map((entry) => toClanHistoryEntry({ entry, tag: tagOf.get(entry.clanId) }))
    ];

    return sortBy(entries, [(entry) => entry.from ?? '', 'desc']);
  }
}
