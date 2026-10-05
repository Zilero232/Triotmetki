import type { DeletionSource } from '../../../../generated';
import type { PrismaExecutor } from '../../../core';
import type { PurgeAccountPayload } from '../contracts';

export type RetentionRule = {
  table: string;
  column: string;
  days: number;
  where?: string;
};

export type RetentionResult = Record<string, number>;

export type PurgeTableInput = {
  rule: RetentionRule;
  cutoff: Date;
};

export type PurgeAccountInput = PurgeAccountPayload & {
  isFinalAttempt: boolean;
};

export type OpenDeletionRequestsInput = {
  db: PrismaExecutor;
  accountIds: readonly bigint[];
  source: DeletionSource;
  reason: string;
};

export type LiftUserRequestsInput = {
  db: PrismaExecutor;
  accountId: bigint;
};
