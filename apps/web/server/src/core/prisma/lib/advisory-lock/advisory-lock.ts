import type { Prisma } from '../../../../../generated';
import type { LockedTransactionInput, TakeLockInput } from '../../prisma.types';

import { asPrismaTransaction } from '../../prisma-transaction';
import { PRISMA_LOCK } from '../../prisma.constants';

const takeLock = ({ tx, scope, key }: TakeLockInput) =>
  tx.$kysely
    .selectFrom((eb) => eb.fn('pg_advisory_xact_lock', [eb.fn('hashtext', [eb.val(scope)]), eb.fn('hashtext', [eb.val(key)])]).as('lock'))
    .select((eb) => eb.lit(1).as('locked'))
    .execute();

export const lockedTransaction = async <T>({ prisma, scope, key, run }: LockedTransactionInput<T>): Promise<T> =>
  prisma.$transaction(
    async (client: Prisma.TransactionClient) => {
      const tx = asPrismaTransaction(client);

      await takeLock({ tx, scope, key });

      return run(tx);
    },
    { timeout: PRISMA_LOCK.timeoutMs, maxWait: PRISMA_LOCK.maxWaitMs }
  );
