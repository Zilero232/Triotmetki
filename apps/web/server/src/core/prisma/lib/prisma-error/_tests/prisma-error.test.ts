import { describe, expect, it } from 'vitest';

import { Prisma } from '../../../../../../generated';
import { PRISMA_CODE } from '../../../prisma.constants';
import { isPrismaRequestError, isTransactionConflict, isUniqueViolation, isUniqueViolationOn } from '../prisma-error';

const known = (code: string) => new Prisma.PrismaClientKnownRequestError('query failed', { code, clientVersion: 'test' });

describe('isPrismaRequestError', () => {
  it('recognises a known request error and nothing that merely looks like one', () => {
    expect(isPrismaRequestError(known(PRISMA_CODE.notFound))).toBe(true);
    expect(isPrismaRequestError(Object.assign(new Error('x'), { code: PRISMA_CODE.notFound }))).toBe(false);
    expect(isPrismaRequestError(null)).toBe(false);
  });
});

describe('isUniqueViolation and isTransactionConflict', () => {
  it('match only their own code', () => {
    expect(isUniqueViolation(known(PRISMA_CODE.uniqueViolation))).toBe(true);
    expect(isUniqueViolation(known(PRISMA_CODE.transactionConflict))).toBe(false);
    expect(isTransactionConflict(known(PRISMA_CODE.transactionConflict))).toBe(true);
    expect(isTransactionConflict(known(PRISMA_CODE.uniqueViolation))).toBe(false);
  });

  it('reject plain errors', () => {
    expect(isUniqueViolation(new Error(PRISMA_CODE.uniqueViolation))).toBe(false);
    expect(isTransactionConflict(new Error(PRISMA_CODE.transactionConflict))).toBe(false);
  });
});

const uniqueOn = (meta: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError('unique', { code: PRISMA_CODE.uniqueViolation, clientVersion: 'test', meta });

const adapterMeta = (index: string) => ({ driverAdapterError: { cause: { kind: 'UniqueConstraintViolation', constraint: { index } } } });

describe('isUniqueViolationOn', () => {
  it('matches the constraint the driver adapter reports', () => {
    expect(
      isUniqueViolationOn({
        error: uniqueOn(adapterMeta('battle_account_id_arena_unique_id_key')),
        constraint: 'battle_account_id_arena_unique_id_key'
      })
    ).toBe(true);
  });

  it('matches a constraint named in the classic meta target', () => {
    expect(
      isUniqueViolationOn({
        error: uniqueOn({ target: 'battle_account_id_arena_unique_id_key' }),
        constraint: 'battle_account_id_arena_unique_id_key'
      })
    ).toBe(true);
  });

  it('rejects a violation of another constraint', () => {
    expect(isUniqueViolationOn({ error: uniqueOn(adapterMeta('play_session_pkey')), constraint: 'battle_account_id_arena_unique_id_key' })).toBe(
      false
    );
  });

  it('rejects an error of another code', () => {
    expect(isUniqueViolationOn({ error: known(PRISMA_CODE.transactionConflict), constraint: 'battle_account_id_arena_unique_id_key' })).toBe(false);
  });
});
