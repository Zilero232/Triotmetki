import type { ClanListQuery } from '@otmetki/schemas';
import type { ExpressionBuilder } from 'kysely';

import type { DB } from '../../../../generated/kysely/database';
import type { Database } from '../../../core';
import type { clanListQueries } from './clan-list.queries';

export type ClanListPageInput = {
  db: Database;
  query: ClanListQuery;
};

export type LatestSnapshot = {
  avg_wn8: number | null;
  avg_win_rate: number | null;
  active_members_7d: number | null;
  elo_rating_10: number | null;
};

export type ClanListFiltersInput = {
  eb: ExpressionBuilder<DB & { latest: LatestSnapshot }, 'clan' | 'latest'>;
  query: ClanListQuery;
};

export type ClanListRow = Awaited<ReturnType<typeof clanListQueries.clanListPage>>[number];

export type ClanListQueries = typeof clanListQueries;
