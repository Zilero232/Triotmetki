import type { ExpectedValuesTable } from '@otmetki/ratings';
import type { Queue } from 'bullmq';

import type { TrackingTier } from '../../../../generated';
import type { LestaClients, PrismaTransaction } from '../../../core';
import type { GainedMark, TankMarks } from './lib/marks-gain';
import type { AccountChanges, LatestTankSnapshotsInput } from './lib/poll-pipeline';

export type { PollResult } from './lib/poll-pipeline';

export type RunPipelineInput = {
  accountIds: readonly number[];
  lane: keyof LestaClients;
  tier: TrackingTier;
  promote?: boolean;
};

export type SweepTier = Extract<TrackingTier, 'dormant' | 'population'>;

export type SeedResult = {
  accounts: number;
  clans: number;
};

export type EnqueueBatchesInput = {
  queue: Queue;
  name: string;
  accountIds: readonly number[];
  priority?: number;
};

export type LatestAccountBattlesInput = {
  tx: PrismaTransaction;
  accountId: number;
};

export type LatestTanksInput = LatestTankSnapshotsInput & {
  tx: PrismaTransaction;
};

export type AccountStoreInput = {
  tx: PrismaTransaction;
  expected: ExpectedValuesTable;
  gained: GainedMark[];
};

export type WriteAccountChangesInput = AccountChanges & AccountStoreInput;

export type WritePlayerTanksInput = Pick<WriteAccountChangesInput, 'baseline' | 'tx'> & {
  marks: readonly TankMarks[];
};

export type StoredMarksInput = {
  tx: PrismaTransaction;
  accountId: number;
  marks: readonly TankMarks[];
};

export type RebuildDaySessionInput = Pick<AccountStoreInput, 'expected' | 'tx'> & {
  accountId: bigint;
  at: Date;
};

export type WithModeExtraInput<T> = {
  base: readonly string[];
  modes: readonly string[];
  run: (extra: readonly string[]) => Promise<T>;
};
