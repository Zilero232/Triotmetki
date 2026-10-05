import type { AggregateField, SettingsValues } from '@otmetki/schemas';

type FieldSpec = { field: string; kind: 'categorical' } | { field: string; kind: 'numeric'; step: number };

export type AggregateCohortInput = {
  contributions: readonly SettingsValues[];
  minCohort: number;
  fields?: readonly FieldSpec[];
};

export type AggregateRow = AggregateField;

export type ReadPathInput = {
  source: unknown;
  path: string;
};

export type ValueOfInput = {
  values: unknown;
  field: string;
};

export type BucketOfInput = {
  spec: FieldSpec;
  value: unknown;
};
