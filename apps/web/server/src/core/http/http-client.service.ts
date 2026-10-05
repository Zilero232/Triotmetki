import type { StandardSchemaV1, StandardSchemaV1InferOutput } from 'ky';

import { Injectable } from '@nestjs/common';

import type { GetJsonInput } from '../../lib/http';
import type { HttpRequestInput, RequestJsonInput } from './http.types';

import { getJson, http } from '../../lib/http';

@Injectable()
export class HttpClientService {
  getText({ url, options }: HttpRequestInput): Promise<string> {
    return http.get(url, options).text();
  }

  getJson<Schema extends StandardSchemaV1>(input: GetJsonInput<Schema>): Promise<StandardSchemaV1InferOutput<Schema>>;
  getJson(input: HttpRequestInput): Promise<unknown>;
  getJson(input: GetJsonInput<StandardSchemaV1> | HttpRequestInput): Promise<unknown> {
    return 'schema' in input ? getJson(input) : http.get(input.url, input.options).json();
  }

  requestJson<Schema extends StandardSchemaV1>(input: RequestJsonInput<Schema>): Promise<StandardSchemaV1InferOutput<Schema>>;
  requestJson(input: HttpRequestInput): Promise<unknown>;
  requestJson(input: HttpRequestInput | RequestJsonInput<StandardSchemaV1>): Promise<unknown> {
    return 'schema' in input ? http(input.url, input.options).json(input.schema) : http(input.url, input.options).json();
  }
}
