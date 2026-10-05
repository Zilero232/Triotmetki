import type { Prisma } from '../../../../../../generated';
import type { AccountStatistics, TankStats } from '../../../../../lib/lesta';
import type { ModeStatsMode } from '../mode-blocks/mode-blocks.types';

export type AccountModeRowsInput = {
  accountId: bigint;
  statistics: AccountStatistics;
};

export type TankModeRowsInput = {
  accountId: bigint;
  stats: readonly TankStats[];
};

export type AccountModeRow = Omit<Prisma.AccountModeStatsCreateManyInput, 'mode'> & { mode: ModeStatsMode };

export type TankModeRow = Omit<Prisma.TankModeStatsCreateManyInput, 'mode'> & { mode: ModeStatsMode };
