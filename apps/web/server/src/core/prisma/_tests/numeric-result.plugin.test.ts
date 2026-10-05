import { describe, expect, it } from 'vitest';

import { Prisma } from '../../../../generated';
import { NumericResultPlugin } from '../numeric-result.plugin';

const transform = (rows: Record<string, unknown>[]) => new NumericResultPlugin().transformResult({ queryId: { queryId: 'q' }, result: { rows } });

describe('NumericResultPlugin', () => {
  it('turns int8 values into numbers', async () => {
    const { rows } = await transform([{ battles: 12n, accountId: 1_234_567_890n }]);

    expect(rows).toEqual([{ battles: 12, accountId: 1_234_567_890 }]);
  });

  it('turns numeric values into numbers', async () => {
    const { rows } = await transform([{ winRate: new Prisma.Decimal('52.75') }]);

    expect(rows).toEqual([{ winRate: 52.75 }]);
  });

  it('converts the elements of an int8 array', async () => {
    const { rows } = await transform([{ ids: [1n, 2n] }]);

    expect(rows).toEqual([{ ids: [1, 2] }]);
  });

  it('leaves strings, dates, nulls and json untouched', async () => {
    const capturedAt = new Date('2026-10-05T00:00:00Z');
    const row = { name: 'x', capturedAt, missing: null, payload: { a: 1 } };

    const { rows } = await transform([row]);

    expect(rows).toEqual([row]);
  });

  it('refuses an int8 value a number cannot hold exactly', async () => {
    await expect(transform([{ total: 2n ** 60n }])).rejects.toThrow(RangeError);
  });
});
