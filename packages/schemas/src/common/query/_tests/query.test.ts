import { describe, expect, it } from 'vitest';
import * as z from 'zod';

import { PAGINATION } from '../query.constants';
import { booleanParam, listParam, paginationQuerySchema, sortQuery } from '../query.schemas';

describe('paginationQuerySchema', () => {
  it('falls back to the configured defaults', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ limit: PAGINATION.defaultLimit, offset: 0 });
  });

  it('coerces query-string numbers', () => {
    expect(paginationQuerySchema.parse({ limit: '10', offset: '20' })).toEqual({ limit: 10, offset: 20 });
  });

  it('rejects a limit above the maximum', () => {
    expect(paginationQuerySchema.safeParse({ limit: PAGINATION.maxLimit + 1 }).success).toBe(false);
  });

  it('rejects a negative offset', () => {
    expect(paginationQuerySchema.safeParse({ offset: -1 }).success).toBe(false);
  });

  it('accepts the deepest offset and rejects one past it', () => {
    expect(paginationQuerySchema.safeParse({ offset: PAGINATION.maxOffset }).success).toBe(true);
    expect(paginationQuerySchema.safeParse({ offset: PAGINATION.maxOffset + 1 }).success).toBe(false);
  });
});

describe('listParam', () => {
  const tiers = listParam(z.coerce.number().int());

  it('splits a comma-separated string and drops empty parts', () => {
    expect(tiers.parse('8, 9,,10')).toEqual([8, 9, 10]);
  });

  it('passes an array through', () => {
    expect(tiers.parse(['8', '10'])).toEqual([8, 10]);
  });

  it('validates every item', () => {
    expect(tiers.safeParse('8,x').success).toBe(false);
  });
});

describe('booleanParam', () => {
  it('reads query-string booleans', () => {
    expect(booleanParam.parse('true')).toBe(true);
    expect(booleanParam.parse('0')).toBe(false);
  });

  it('rejects anything else', () => {
    expect(booleanParam.safeParse('yes').success).toBe(false);
  });
});

describe('sortQuery', () => {
  const schema = sortQuery(z.enum(['battles', 'wn8']));

  it('defaults to descending order with no sort field', () => {
    expect(schema.parse({})).toEqual({ order: 'desc' });
  });

  it('rejects a field outside the enum', () => {
    expect(schema.safeParse({ sort: 'nickname' }).success).toBe(false);
  });
});
