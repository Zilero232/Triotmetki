import type { AnalyticsExport, RawStatsExport } from '@otmetki/schemas';

import type { AccountSnapshot, Player, PlayerTank } from '../../../../generated';

export type AccountExport = RawStatsExport['accounts'][number];

export type TankExport = RawStatsExport['tanks'][number];

export type SessionExport = AnalyticsExport['sessions'][number];

export type BattleExport = AnalyticsExport['battles'][number];

export type TankProgressExport = AnalyticsExport['tankProgress'][number];

export type ToAccountExportInput = {
  player: Player;
  snapshot: AccountSnapshot | undefined;
};

export type TankProgressRow = Pick<PlayerTank, 'accountId' | 'progressBattles' | 'progressXp' | 'tankId'>;
