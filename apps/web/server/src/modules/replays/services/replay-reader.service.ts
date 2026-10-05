import type { ReplaySummary as ReplayView } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { Replay } from '../../../../generated';
import type {
  BestOfWeek,
  MineInput,
  ReplayFile,
  ReplayPage,
  ReplaySearchQuery,
  ReplayTracks,
  ReplayVersions,
  ReplayViewInput,
  ViewReplayInput
} from '../replays.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { insensitiveEquals, paginate, parseJsonText, toIsoDate, weekWindow } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { ObjectStorage, PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { BEST_OF_WEEK } from '../config/best-of-week.constants';
import { REPLAY_SEARCH } from '../config/search.constants';
import { replayTracksSchema } from '../dto/replays.schemas';
import { publicReplayWhere, searchOrder, searchWhere } from '../lib/replay-search/replay-search';
import { toReplayView } from '../mappers/replay-view.mappers';

@Injectable()
export class ReplayReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
    private readonly config: AppConfigService,
    private readonly catalog: VehicleCatalogService
  ) {}

  async get({ id, viewerUserId }: ViewReplayInput): Promise<ReplayView> {
    const replay = await this.visible({ id, viewerUserId });

    if (replay.status !== 'parsed') {
      return this.view({ replay, viewerUserId });
    }

    await this.prisma.replay.updateMany({ where: { id }, data: { views: { increment: 1 } } });

    return this.view({ replay: { ...replay, views: replay.views + 1 }, viewerUserId });
  }

  async search(query: ReplaySearchQuery): Promise<ReplayPage> {
    const byNickname = query.accountId === undefined ? query.player : undefined;
    const player = byNickname
      ? await this.prisma.player.findFirst({ where: { nickname: insensitiveEquals(byNickname) }, select: { accountId: true } })
      : null;

    if (byNickname && !player) {
      return { items: [], total: 0, limit: query.limit, offset: query.offset };
    }

    const where = searchWhere({ query, playerAccountId: player?.accountId ?? null, tankIds: await this.tankIdsOf(query) });
    const page = await paginate({
      limit: query.limit,
      offset: query.offset,
      fetch: (window) => this.prisma.replay.findMany({ where, orderBy: searchOrder(query.sort), ...window }),
      count: () => this.prisma.replay.count({ where })
    });

    return { ...page, items: page.items.map((row) => this.view({ replay: row })) };
  }

  async versions(): Promise<ReplayVersions> {
    const rows = await this.prisma.replay.groupBy({
      by: ['gameVersion'],
      where: { ...publicReplayWhere, gameVersion: { not: null } },
      _max: { playedAt: true },
      orderBy: { _max: { playedAt: 'desc' } },
      take: REPLAY_SEARCH.versionsLimit
    });

    return { versions: rows.flatMap((row) => (row.gameVersion === null ? [] : [row.gameVersion])) };
  }

  async mine({ userId, limit, offset }: MineInput): Promise<ReplayPage> {
    const where = { uploaderUserId: userId };
    const page = await paginate({
      limit,
      offset,
      fetch: (window) => this.prisma.replay.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], ...window }),
      count: () => this.prisma.replay.count({ where })
    });

    return { ...page, items: page.items.map((row) => this.view({ replay: row, viewerUserId: userId })) };
  }

  async bestOfWeek(week: string | undefined): Promise<BestOfWeek> {
    const { start, end, weekStart } = weekWindow(week ? new Date(`${week}T00:00:00Z`) : new Date());
    const inWeek = { ...publicReplayWhere, playedAt: { gte: start, lt: end } };
    const featured = await this.prisma.replay.findMany({
      where: { ...inWeek, isFeatured: true },
      orderBy: { damageDealt: 'desc' },
      take: BEST_OF_WEEK.size
    });

    const rows =
      featured.length > 0
        ? featured
        : await this.prisma.replay.findMany({
            where: { ...inWeek, damageDealt: { not: null } },
            orderBy: { damageDealt: 'desc' },
            take: BEST_OF_WEEK.size
          });

    return { weekStart: toIsoDate(weekStart) ?? '', items: rows.map((row) => this.view({ replay: row })) };
  }

  async file({ id, viewerUserId }: ViewReplayInput): Promise<ReplayFile> {
    const replay = await this.visible({ id, viewerUserId });

    return { fileName: replay.fileName, bytes: await this.storage.get(replay.storageKey) };
  }

  async tracks({ id, viewerUserId }: ViewReplayInput): Promise<ReplayTracks> {
    const replay = await this.visible({ id, viewerUserId });

    if (!replay.timelineKey) {
      return { tracks: [] };
    }

    const bytes = await this.storage.get(replay.timelineKey);
    const parsed = replayTracksSchema.safeParse(parseJsonText(new TextDecoder().decode(bytes)));

    return parsed.success ? parsed.data : { tracks: [] };
  }

  private async tankIdsOf({ tiers, types, nations }: ReplaySearchQuery): Promise<number[] | null> {
    if (!tiers?.length && !types?.length && !nations?.length) {
      return null;
    }

    const entries = await this.catalog.filter({ tiers, types, nations });

    return entries.map((entry) => entry.summary.tankId);
  }

  private async visible({ id, viewerUserId }: ViewReplayInput): Promise<Replay> {
    const replay = await this.prisma.replay.findUnique({ where: { id } });

    if (!replay || (replay.visibility === 'private' && replay.uploaderUserId !== viewerUserId)) {
      throw new AppNotFoundException('NOT_FOUND', `No replay ${id}`);
    }

    return replay;
  }

  private view({ replay, viewerUserId }: ReplayViewInput): ReplayView {
    return toReplayView({ replay, viewerUserId, apiUrl: this.config.get('API_URL') });
  }
}
