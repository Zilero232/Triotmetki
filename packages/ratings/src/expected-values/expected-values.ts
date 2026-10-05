import { z } from 'zod';

import type { ExpectedValues, ExpectedValuesTable, XvmExpectedValuesFile } from './expected-values.types';

const xvmNumber = z.coerce.number().refine(Number.isFinite);

const xvmExpectedValuesSchema = z.object({
  header: z.looseObject({ version: z.union([z.string(), z.number()]).optional(), source: z.string().optional() }).optional(),
  data: z.array(
    z.looseObject({
      IDNum: xvmNumber,
      expDef: xvmNumber,
      expFrag: xvmNumber,
      expSpot: xvmNumber,
      expDamage: xvmNumber,
      expWinRate: xvmNumber
    })
  )
});

export const parseXvmExpectedValues = (input: unknown): XvmExpectedValuesFile => {
  const parsed = xvmExpectedValuesSchema.parse(typeof input === 'string' ? JSON.parse(input) : input);
  const table: ExpectedValuesTable = new Map(
    parsed.data.map((row): [number, ExpectedValues] => [
      row.IDNum,
      {
        tankId: row.IDNum,
        expDamage: row.expDamage,
        expSpot: row.expSpot,
        expFrag: row.expFrag,
        expDef: row.expDef,
        expWinRate: row.expWinRate
      }
    ])
  );

  return { header: parsed.header ?? {}, table };
};

export const toXvmExpectedValues = (table: ExpectedValuesTable) => ({
  data: [...table.values()].map(({ tankId, expDef, expFrag, expSpot, expDamage, expWinRate }) => ({
    IDNum: tankId,
    expDef,
    expFrag,
    expSpot,
    expDamage,
    expWinRate
  }))
});
