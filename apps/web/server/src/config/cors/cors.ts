import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

import { unique } from 'remeda';

import type { Env } from '../env/env.types';
import type { CorsOptionsForInput } from './cors.types';

import { envList } from '../env-list/env-list';
import { CORS } from './cors.constants';

const originOf = (url: string): string | null => {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
};

export const allowedOrigins = (env: Pick<Env, 'CORS_ORIGINS' | 'WEB_URL'>): string[] => {
  const extra = envList(env.CORS_ORIGINS);
  const web = originOf(env.WEB_URL);

  return unique([...(web ? [web] : []), ...extra]);
};

export const guardedOrigins = (env: Pick<Env, 'API_URL' | 'CORS_ORIGINS' | 'WEB_URL'>): string[] => {
  const api = originOf(env.API_URL);

  return unique([...allowedOrigins(env), ...(api ? [api] : [])]);
};

export const isPublicCorsPath = (url: string): boolean => {
  const [path = ''] = url.split('?');

  return CORS.publicPaths.some((pattern) => pattern.test(path));
};

export const corsOptionsFor = ({ url, origins }: CorsOptionsForInput): CorsOptions =>
  isPublicCorsPath(url)
    ? { origin: '*', credentials: false, methods: [...CORS.publicMethods], exposedHeaders: [...CORS.exposedHeaders] }
    : { origin: origins, credentials: true, methods: [...CORS.methods], exposedHeaders: [...CORS.exposedHeaders] };
