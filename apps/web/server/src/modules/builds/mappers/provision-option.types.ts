import type { Provision } from '../../../../generated';

export type ReadStringInput = {
  record: Record<PropertyKey, unknown>;
  key: string;
};

export type PriceOfInput = {
  row: Provision;
  data: Record<PropertyKey, unknown>;
};
