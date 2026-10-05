import type { PoolConfig } from 'pg';

import type { Prisma } from '../../../generated';
import type { Database } from './kysely';
import type { PrismaService } from './prisma.service';

export type CreatePrismaClientInput = {
  url: string;
  pool?: Omit<PoolConfig, 'connectionString'>;
  log?: Prisma.LogLevel[];
};

export type CreatePgPoolInput = Pick<CreatePrismaClientInput, 'pool' | 'url'>;

export type PrismaTransaction = Prisma.TransactionClient & { $kysely: Database };

export type LockedTransactionInput<T> = {
  prisma: Pick<PrismaService, '$transaction'>;
  scope: string;
  key: string;
  run: (tx: PrismaTransaction) => Promise<T>;
};

export type TakeLockInput = Pick<LockedTransactionInput<unknown>, 'key' | 'scope'> & { tx: PrismaTransaction };

export type PrismaModuleOptions = {
  poolMax?: number;
  statementTimeoutMs?: number;
};

export type PrismaExecutor = Prisma.TransactionClient | PrismaService;
