import type { ClanListPage, ClanListQuery } from '@otmetki/schemas';

import { Inject, Injectable, Optional } from '@nestjs/common';

import type { ClanListQueries } from '../queries/clan-list.types';

import { PrismaService } from '../../../core';
import { CLAN_LIST_QUERIES } from '../config/tokens.constants';
import { toClanListItem } from '../mappers/clans.mappers';
import { clanListQueries } from '../queries/clan-list.queries';

@Injectable()
export class ClanListService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject(CLAN_LIST_QUERIES) private readonly queries: ClanListQueries = clanListQueries
  ) {}

  async list(query: ClanListQuery): Promise<ClanListPage> {
    const rows = await this.queries.clanListPage({ db: this.prisma.$kysely, query });

    return {
      items: rows.map(toClanListItem),
      total: rows[0]?.total ?? 0,
      limit: query.limit,
      offset: query.offset
    };
  }
}
