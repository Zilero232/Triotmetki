import type { KyselyPlugin, PluginTransformQueryArgs, PluginTransformResultArgs, QueryResult, RootOperationNode, UnknownRow } from 'kysely';

import { Prisma } from '../../../generated';

const toSafeNumber = (value: bigint): number => {
  const converted = Number(value);

  if (!Number.isSafeInteger(converted)) {
    throw new RangeError(`int8 value ${value} does not fit a number exactly`);
  }

  return converted;
};

const toPlainNumber = (value: unknown): unknown => {
  if (typeof value === 'bigint') {
    return toSafeNumber(value);
  }

  if (Prisma.Decimal.isDecimal(value)) {
    return value.toNumber();
  }

  if (Array.isArray(value)) {
    return value.map(toPlainNumber);
  }

  return value;
};

const toPlainRow = (row: UnknownRow): UnknownRow => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, toPlainNumber(value)]));

export class NumericResultPlugin implements KyselyPlugin {
  transformQuery({ node }: PluginTransformQueryArgs): RootOperationNode {
    return node;
  }

  async transformResult({ result }: PluginTransformResultArgs): Promise<QueryResult<UnknownRow>> {
    return { ...result, rows: result.rows.map(toPlainRow) };
  }
}
