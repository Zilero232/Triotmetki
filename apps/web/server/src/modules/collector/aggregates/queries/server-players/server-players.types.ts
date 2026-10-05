import type { StatsMode } from '../../../../../../generated';

export type ServerPlayersSqlInput = {
  mode: StatsMode;
  sinces: readonly Date[];
  until: Date;
};

export type ServerPlayersRow = {
  tankId: number;
  cohort: string;
  players: number[];
};
