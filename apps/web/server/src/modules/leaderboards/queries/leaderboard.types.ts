import type { LeaderboardQuery, RatingPeriod } from '@otmetki/schemas';
import type { ExpressionBuilder } from 'kysely';

import type { DB } from '../../../../generated/kysely/database';
import type { Database } from '../../../core';
import type { leaderboardQueries } from './leaderboard.queries';

export type RankedRow = {
  accountId: number | null;
  clanId: number | null;
  name: string;
  clanTag: string | null;
  color: string | null;
  value: number | null;
  battles: number;
  delta: number | null;
};

export type LeaderboardPage = {
  rows: RankedRow[];
  total: number;
};

export type ClansBoardInput = {
  db: Database;
  query: LeaderboardQuery;
};

export type RankedBoardInput = ClansBoardInput & {
  minBattles: number;
};

export type PlayersBoardInput = RankedBoardInput & {
  isStreamersOnly: boolean;
};

export type RisingStarsBoardInput = RankedBoardInput & {
  period: RatingPeriod;
};

export type PlayerRankedRow = Omit<RankedRow, 'clanId' | 'color' | 'delta'> & Partial<Pick<RankedRow, 'delta'>>;

export type PageOfInput = {
  rows: Promise<RankedRow[]>;
  total: Promise<{ total: number } | undefined>;
};

export type TankFiltersInput = {
  eb: ExpressionBuilder<DB, 'account_tank_rating' | 'vehicle'>;
  query: LeaderboardQuery;
};

export type LeaderboardQueries = typeof leaderboardQueries;
