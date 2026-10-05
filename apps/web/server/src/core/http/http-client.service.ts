import type { StandardSchemaV1, StandardSchemaV1InferOutput } from 'ky';

import { Injectable } from '@nestjs/common';

import type { GetJsonInput } from '../../lib/http';
import type { HttpRequestInput } from './http.types';

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

  requestJson({ url, options }: HttpRequestInput): Promise<unknown> {
    return http(url, options).json();
  }
}
