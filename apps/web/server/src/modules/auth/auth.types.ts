import type { Prisma } from '../../../generated';

export type RevokeMovedDevicesInput = {
  tx: Prisma.TransactionClient;
  accountId: bigint;
  userId: string;
};
