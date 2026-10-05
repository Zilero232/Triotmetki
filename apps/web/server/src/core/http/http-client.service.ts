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

  getJson<Schema extends StandardSchemaV1>(input: GetJsonInput<Schema>): Promise<StandardSchemaV1InferOutput<Schema>> {
    return getJson(input);
  }

  requestJson<Schema extends StandardSchemaV1>({ url, schema, options }: RequestJsonInput<Schema>): Promise<StandardSchemaV1InferOutput<Schema>> {
    return http(url, options).json(schema);
  }
}
