import type { ApiErrorCode } from '@otmetki/schemas';

import { HttpStatus } from '@nestjs/common';

import type { ModErrorCode } from '../../exceptions';

import { PRISMA_CODE } from '../../../core';

export const STATUS_TO_CODE: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_FAILED',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'VALIDATION_FAILED',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'VALIDATION_FAILED',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'LESTA_UNAVAILABLE'
};

export const LESTA_NOT_CONNECTED = {
  status: HttpStatus.NOT_FOUND,
  code: 'INTEGRATION_UNAVAILABLE',
  error: 'Lesta API is not connected'
} as const satisfies { status: number; code: ApiErrorCode; error: string };

export const MOD_REPLY = {
  pathPrefixes: ['/mod/', '/replays/mod'],
  contractPrefix: '/mod/',
  apiPaths: ['/mod/bind-code', '/mod/devices', '/mod/sync', '/mod/reports'],
  serverTimeHeader: 'x-otmetki-server-time',
  retryAfterHeader: 'Retry-After'
} as const;

export const STATUS_TO_MOD_ERROR: Partial<Record<number, ModErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'invalid_payload',
  [HttpStatus.UNAUTHORIZED]: 'unknown_device',
  [HttpStatus.FORBIDDEN]: 'account_mismatch',
  [HttpStatus.NOT_FOUND]: 'invalid_payload',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'too_large',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'invalid_payload',
  [HttpStatus.TOO_MANY_REQUESTS]: 'rate_limited'
};

export const PRISMA_TO_HTTP: Partial<Record<string, { status: number; code: ApiErrorCode }>> = {
  [PRISMA_CODE.notFound]: { status: HttpStatus.NOT_FOUND, code: 'NOT_FOUND' },
  [PRISMA_CODE.uniqueViolation]: { status: HttpStatus.CONFLICT, code: 'CONFLICT' }
};
