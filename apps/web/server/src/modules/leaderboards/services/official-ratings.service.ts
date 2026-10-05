import type { OfficialNeighbors, OfficialRankHistory, OfficialRankPoint, OfficialTop, OfficialTopEntry, OfficialTopQuery } from '@otmetki/schemas';

import { Inject, Injectable } from '@nestjs/common';
import { fromUnixTime } from 'date-fns';
import { isNonNullish } from 'remeda';

import type { LestaClient } from '../../../lib/lesta';
import type { OfficialEntriesInput, OfficialHistoryInput, OfficialNeighborsInput, OfficialPointInput } from '../leaderboards.types';

import { isoDay, OFFICIAL_FIELD_TO_LESTA, OFFICIAL_PERIOD_TO_LESTA, toNumber, toOfficialRank } from '../../../common/lib';
import { LESTA_CLIENT, PrismaService } from '../../../core';
import { OFFICIAL_HALL } from '../config/official-hall.constants';

@Injectable()
export class OfficialRatingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LESTA_CLIENT) private readonly lesta: LestaClient
  ) {}

  async top({ period, field, limit, page }: OfficialTopQuery): Promise<OfficialTop> {
    const rankField = OFFICIAL_FIELD_TO_LESTA[field];
    const rows = await this.lesta.ratings.topList({ type: OFFICIAL_PERIOD_TO_LESTA[period], rankField, limit, pageNo: page });

    return { period, field, items: await this.entries({ rows, rankField }) };
  }

  async neighbors({ accountId, query }: OfficialNeighborsInput): Promise<OfficialNeighbors> {
    const rankField = OFFICIAL_FIELD_TO_LESTA[query.field];

    const rows = await this.lesta.ratings.neighborList({
      type: OFFICIAL_PERIOD_TO_LESTA[query.period],
      rankField,
      accountId: toNumber(accountId),
      limit: query.limit
    });

    return { period: query.period, field: query.field, accountId: toNumber(accountId), items: await this.entries({ rows, rankField }) };
  }

  async history({ accountId, query }: OfficialHistoryInput): Promise<OfficialRankHistory> {
    const type = OFFICIAL_PERIOD_TO_LESTA[query.period];
    const dates = await this.lesta.ratings.dateList({ type, accountId: toNumber(accountId) });
    const recent = (dates[type]?.dates ?? []).toSorted((left, right) => right - left).slice(0, query.days);
    const points = await Promise.all(recent.map((date) => this.point({ accountId, type, field: query.field, date })));

    return {
      accountId: toNumber(accountId),
      period: query.period,
      field: query.field,
      points: points.filter(isNonNullish).toSorted((left, right) => left.date.localeCompare(right.date))
    };
  }

  private async point({ accountId, type, field, date }: OfficialPointInput): Promise<OfficialRankPoint | null> {
    const accounts = await this.lesta.ratings.accounts({ type, accountIds: [toNumber(accountId)], date }).catch(() => null);
    const rank = toOfficialRank(accounts?.[String(accountId)]?.[OFFICIAL_FIELD_TO_LESTA[field]]);

    return rank ? { date: isoDay(fromUnixTime(date)), value: rank.value, rank: rank.rank } : null;
  }

  private async entries({ rows, rankField }: OfficialEntriesInput): Promise<OfficialTopEntry[]> {
    const ids = rows.map((row) => BigInt(row.account_id));

    const known = await this.prisma.player.findMany({
      where: { accountId: { in: ids } },
      select: { accountId: true, nickname: true, clanMembership: { select: { clan: { select: { tag: true } } } } }
    });

    const byId = new Map(known.map((player) => [toNumber(player.accountId), player]));
    const missing = rows.map((row) => row.account_id).filter((id) => !byId.has(id));
    const fetched = missing.length > 0 ? await this.nicknames(missing) : new Map<number, string>();

    return rows.flatMap((row) => {
      const rank = toOfficialRank(row[rankField]);

      if (!rank) {
        return [];
      }

      const player = byId.get(row.account_id);

      return [
        {
          accountId: row.account_id,
          nickname: player?.nickname ?? fetched.get(row.account_id) ?? null,
          clanTag: player?.clanMembership?.clan.tag ?? null,
          ...rank
        }
      ];
    });
  }

  private async nicknames(accountIds: readonly number[]): Promise<Map<number, string>> {
    const infos = await this.lesta.account.info({ accountIds, fields: OFFICIAL_HALL.nicknameFields }).catch(() => ({}));

    return new Map(
      Object.entries(infos).flatMap(([id, info]) => (info && typeof info.nickname === 'string' ? [[Number(id), info.nickname] as const] : []))
    );
  }
}
