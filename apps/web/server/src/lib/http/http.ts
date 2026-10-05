import type { StandardSchemaV1, StandardSchemaV1InferOutput } from 'ky';

import ky from 'ky';

import type { GetJsonInput } from './http.types';

import { HTTP } from './http.constants';

export const http = ky.create({
  headers: { 'user-agent': HTTP.userAgent },
  timeout: HTTP.timeoutMs,
  retry: 0
});

export const getJson = <Schema extends StandardSchemaV1>({
  url,
  schema,
  options
}: GetJsonInput<Schema>): Promise<StandardSchemaV1InferOutput<Schema>> => http.get(url, { retry: HTTP.retry, ...options }).json(schema);
