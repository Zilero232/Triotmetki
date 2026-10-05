import type { Options } from 'ky';
import type { z } from 'zod';

import type { LestaOutcome } from '../outcome/outcome.types';
import type { RateLimiter } from '../rate-limit/rate-limit.types';
import type { LestaMeta } from '../schemas/common/common.types';
import type { LESTA_LANGUAGES } from './client.constants';

export type LestaLanguage = (typeof LESTA_LANGUAGES)[number];

export type FieldList = readonly string[];

type LestaParamScalar = boolean | number | string;

export type LestaParamValue = LestaParamScalar | readonly LestaParamScalar[] | null | undefined;

export type LestaParams = Record<string, LestaParamValue>;

export type LestaFetch = NonNullable<Options['fetch']>;

export type LestaRetryOptions = {
  retries?: number;
  factor?: number;
  minTimeout?: number;
  maxTimeout?: number;
  randomize?: boolean;
};

export type LestaClientOptions = {
  applicationId: string;
  baseUrl?: string;
  language?: LestaLanguage;
  accessToken?: string;
  rateLimiter?: RateLimiter;
  retry?: LestaRetryOptions;
  timeoutMs?: number;
  fetch?: LestaFetch;
  onOutcome?: (outcome: LestaOutcome) => void;
};

export type LestaCallOptions = {
  language?: LestaLanguage;
  accessToken?: string;
  extra?: FieldList;
};

export type LestaFieldsOption<F extends FieldList | undefined> = {
  fields?: F;
};

export type LestaRequestInput<T> = {
  method: string;
  params?: LestaParams;
  schema: z.ZodType<T>;
};

export type LestaResponse<T> = {
  data: T;
  meta: LestaMeta;
};

export type LestaRequester = {
  call: <T>(input: LestaRequestInput<T>) => Promise<LestaResponse<T>>;
  applicationId: string;
  baseUrl: string;
};

export type DeepPartial<T> = T extends readonly (infer Item)[]
  ? DeepPartial<Item>[]
  : T extends object
    ? { [Key in keyof T]?: DeepPartial<T[Key]> }
    : T;

export type Selected<F extends FieldList | undefined, T> = F extends FieldList ? DeepPartial<T> : T;

export type FieldAwareSchemaInput<T, F extends FieldList | undefined> = {
  schema: z.ZodType<T>;
  fields: F | undefined;
};

export type CallParamsInput = LestaCallOptions & {
  fields?: FieldList;
};

export type SendInput = {
  method: string;
  params?: LestaParams;
};

export type ReadEnvelopeInput = Pick<LestaClientOptions, 'onOutcome'> & {
  response: Response;
  method: string;
};
