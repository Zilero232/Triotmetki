import type { Options, StandardSchemaV1 } from 'ky';

export type GetJsonInput<Schema extends StandardSchemaV1> = {
  url: string;
  schema: Schema;
  options?: Options;
};
