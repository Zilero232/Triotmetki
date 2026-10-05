import type { Options, StandardSchemaV1 } from 'ky';

export type HttpRequestInput = {
  url: string;
  options?: Options;
};

export type RequestJsonInput<Schema extends StandardSchemaV1> = HttpRequestInput & {
  schema: Schema;
};
