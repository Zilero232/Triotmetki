import { Injectable } from '@nestjs/common';
import { unique } from 'remeda';

import type {
  CollectorPageRow,
  CollectorsQuery,
  CollectorsView,
  HeldAchievement,
  PlayerCollection,
  PlayerCollectionInput,
  VisiblePlayer
} from '../achievements-rarity.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { paginate } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { EntitlementsService } from '../../billing';
import { ACHIEVEMENTS_VIEW } from '../config/view.constants';
import { heldNames, obtainableNames, readCounts } from '../lib/account-rollup/account-rollup';
import { byRarity } from '../lib/catalog-sort/catalog-sort';
import { seriesProgress } from '../lib/series-progress/series-progress';
import { standing } from '../lib/standing/standing';
import { toCollectorRow, toSeriesView } from '../mappers/collectors.mappers';
import { COLLECTOR_ROW_SELECT, PLAYER_COLLECTION_SELECT, RANKED_COLLECTORS } from '../selects/collectors.selects';
import { AchievementCatalogReaderService } from './achievement-catalog-reader.service';

@Injectable()
export class CollectorsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: AchievementCatalogReaderService,
    private readonly entitlements: EntitlementsService
  ) {}

  async leaderboard({ limit, offset }: CollectorsQuery): Promise<CollectorsView> {
    const page = await paginate({
      limit,
      offset,
      fetch: (window) =>
        this.prisma.accountAchievements.findMany({
          where: RANKED_COLLECTORS,
          orderBy: [{ points: 'desc' }, { held: 'desc' }, { accountId: 'asc' }],
          ...window,
          select: COLLECTOR_ROW_SELECT
        }),
      count: () => this.prisma.accountAchievements.count({ where: RANKED_COLLECTORS })
    });

    const tags = await this.clanTags(page.items);

    return {
      ...page,
      items: page.items.map((row, index) =>
        toCollectorRow({ row, rank: offset + index + 1, clanTag: row.player.clanId === null ? null : (tags.get(row.player.clanId) ?? null) })
      )
    };
  }

  async player({ accountId, viewerUserId }: PlayerCollectionInput): Promise<PlayerCollection> {
    const player = await this.visiblePlayer(accountId);
    const set = player.achievementSet;
    const ownerId = player.lestaLinks[0]?.userId ?? null;

    const [entries, ranked, above, isPlus] = await Promise.all([
      this.catalog.entries(),
      this.prisma.accountAchievements.count({ where: RANKED_COLLECTORS }),
      set?.computedAt ? this.prisma.accountAchievements.count({ where: { ...RANKED_COLLECTORS, points: { gt: set.points } } }) : Promise.resolve(0),
      ownerId ? this.entitlements.isPlus(ownerId) : Promise.resolve(false)
    ]);

    const items = new Map(entries.map((entry) => [entry.item.name, entry.item]));
    const counts = readCounts(set?.counts ?? {});
    const held: HeldAchievement[] = byRarity(
      heldNames(counts).flatMap((name) => {
        const item = items.get(name);

        return item ? [{ ...item, count: counts[name] ?? 0 }] : [];
      })
    );

    const position = set?.computedAt ? standing({ above, total: ranked }) : { rank: null, topPercent: null };

    return {
      accountId: Number(accountId),
      nickname: player.nickname,
      fetchedAt: set?.fetchedAt.toISOString() ?? null,
      held: set?.held ?? 0,
      points: set?.points ?? 0,
      completion: set?.completion ?? 0,
      obtainable: obtainableNames(entries.map((entry) => entry.item)).size,
      rank: position.rank,
      topPercent: position.topPercent,
      sample: ranked,
      rarest: held.slice(0, ACHIEVEMENTS_VIEW.rarestHeld),
      series: seriesProgress(readCounts(set?.maxSeries ?? {})).map((row) => toSeriesView({ row, items })),
      showcase: isPlus ? held.slice(0, ACHIEVEMENTS_VIEW.showcaseSize) : null,
      viewerIsOwner: viewerUserId !== null && ownerId === viewerUserId
    };
  }

  private async clanTags(rows: readonly CollectorPageRow[]): Promise<Map<bigint, string>> {
    const clanIds = unique(rows.flatMap((row) => (row.player.clanId === null ? [] : [row.player.clanId])));
    const clans =
      clanIds.length > 0 ? await this.prisma.clan.findMany({ where: { clanId: { in: clanIds } }, select: { clanId: true, tag: true } }) : [];

    return new Map(clans.map((clan) => [clan.clanId, clan.tag]));
  }

  private async visiblePlayer(accountId: bigint): Promise<VisiblePlayer> {
    const player = await this.prisma.player.findUnique({
      where: { accountId },
      select: PLAYER_COLLECTION_SELECT
    });

    if (!player) {
      throw new AppNotFoundException('PLAYER_NOT_FOUND', `No player with id ${accountId}`);
    }

    if (player.isHidden) {
      throw new AppNotFoundException('LESTA_ACCOUNT_HIDDEN', 'This player asked for their data to be hidden');
    }

    return player;
  }
}
