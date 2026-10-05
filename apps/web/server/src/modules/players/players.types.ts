import type { InsightsPeriod, OfficialRatingPeriod, PlayerTanksQuery, Playtime, PopularPlayersQuery, TimeSeriesQuery } from '@otmetki/schemas';

import type { AccountRating, AccountSnapshot, Battle, TankModeStats } from '../../../generated';
import type { CareerSource, ModeStatsMode } from '../../common/lib';
import type { AccountInfo } from '../../lib/lesta';
import type { HistoryWindowPolicy } from './lib';
import type { CareerRecordRef, CareerTotals } from './mappers';
import type { CareerRecordTimes } from './selects';

export type LestaPlayerInfo = AccountInfo;

export type FromSnapshotInput = {
  snapshot: AccountSnapshot;
  rating: AccountRating | null;
};

export type PlayerTanksInput = {
  accountId: bigint;
  query: PlayerTanksQuery;
};

export type HistoryInput = {
  accountId: bigint;
  query: TimeSeriesQuery;
  policy: HistoryWindowPolicy;
};

export type HistoryPolicyInput = {
  accountId: bigint;
  viewerUserId: string | null;
};

export type ActivityInput = {
  accountId: bigint;
  days: number;
};

export type SessionsInput = {
  accountId: bigint;
  limit: number;
  offset: number;
};

export type SessionDetailInput = {
  accountId: bigint;
  sessionId: string;
};

export type SessionBattleInput = {
  battle: Battle;
  mapName: Map<string, string>;
};

export type InsightsInput = {
  accountId: bigint;
  period: InsightsPeriod;
};

export type PlaytimeRow = {
  weekday: number;
  hour: number;
  battles: number;
  wins: number;
  damage: number;
};

export type PopularPlayersInput = PopularPlayersQuery;

export type PlaytimeResultInput = {
  rows: PlaytimeRow[];
  source: Playtime['source'];
};

export type PopularRow = {
  accountId: bigint;
  views: number;
};

export type CareerModesInput = {
  accountId: bigint;
  allowLive: boolean;
};

export type StoredCareerLineInput = {
  mode: ModeStatsMode;
  totals: CareerTotals;
  rows: TankModeStats[];
};

export type CareerRecordsInput = {
  accountId: bigint;
  source: CareerSource | null;
  isStored: boolean;
};

export type CareerRecordInput = {
  ref: CareerRecordRef;
  times: CareerRecordTimes | null;
};

export type OfficialPeriodInput = {
  accountId: bigint;
  period: OfficialRatingPeriod;
};
