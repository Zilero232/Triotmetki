import type { Expression, SqlBool } from 'kysely';

import type { DeletionSource } from '../../../../generated';
import type { DB } from '../../../../generated/kysely/database';
import type { PrismaExecutor, PrismaTransaction } from '../../../core';
import type { PurgeAccountPayload } from '../contracts';

export type RetentionRule = {
  [Table in keyof DB]: {
    table: Table;
    column: keyof DB[Table] & string;
    days: number;
    where?: Expression<SqlBool>;
  };
}[keyof DB];

export type RetentionResult = Record<string, number>;

export type PurgeTableInput = {
  rule: RetentionRule;
  cutoff: Date;
};

export type PurgeAccountInput = PurgeAccountPayload & {
  isFinalAttempt: boolean;
};

export type ErasePurgedAccountInput = PurgeAccountPayload;

export type DeleteAccountRowsInput = {
  tx: PrismaTransaction;
  accountId: number;
  replayIds: readonly string[];
};

export type PurgeRelationalInput = DeleteAccountRowsInput & Pick<PurgeAccountPayload, 'requestId'>;

export type ReleaseRequestInput = {
  requestId: string;
  error: unknown;
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
