import type { Prisma } from '../../../generated';
import type { PrismaTransaction } from './prisma.types';

const isPrismaTransaction = (tx: Prisma.TransactionClient): tx is PrismaTransaction => '$kysely' in tx;

export const asPrismaTransaction = (tx: Prisma.TransactionClient): PrismaTransaction => {
  if (!isPrismaTransaction(tx)) {
    throw new Error('The transaction client has no $kysely: build the client with createPrismaClient');
  }

  return tx;
};
