import type { ApiErrorCode, ApiErrorIssue } from '@otmetki/schemas';

import { isNumber, isObjectType, isPlainObject, isString } from 'remeda';

import type { ModErrorCode } from '../../../../exceptions';
import type { BodyWithFieldInput } from './exception-reply.types';

import { LestaApiError, LestaHttpError, LestaNetworkError, LestaQueueFullError } from '../../../../../lib/lesta';
import { MOD_REPLY, STATUS_TO_CODE, STATUS_TO_MOD_ERROR } from '../../all-exceptions.constants';

export const codeForStatus = (status: number): ApiErrorCode => STATUS_TO_CODE[status] ?? 'INTERNAL_ERROR';

export const modErrorForStatus = (status: number): ModErrorCode => STATUS_TO_MOD_ERROR[status] ?? 'server_error';

export const isModContractPath = (path: string): boolean => {
  const isUnderPath = (apiPath: string) => path === apiPath || path.startsWith(`${apiPath}/`);
  const isApiRoute = MOD_REPLY.apiPaths.some(isUnderPath);

  return path.startsWith(MOD_REPLY.contractPrefix) && !isApiRoute;
};

export const isLestaError = (error: unknown): boolean =>
  error instanceof LestaApiError || error instanceof LestaHttpError || error instanceof LestaNetworkError || error instanceof LestaQueueFullError;

export const middlewareStatus = (error: unknown): number | null => {
  if (!isObjectType(error)) {
    return null;
  }

  const status = 'statusCode' in error ? error.statusCode : 'status' in error ? error.status : null;

  return isNumber(status) && status >= 400 && status < 500 ? status : null;
};

export const zodIssues = (error: unknown): ApiErrorIssue[] | undefined => {
  if (!isObjectType(error) || !('issues' in error) || !Array.isArray(error.issues)) {
    return undefined;
  }

  return error.issues.filter(isObjectType).map((issue) => ({
    path: 'path' in issue && Array.isArray(issue.path) ? issue.path.filter((segment) => isString(segment) || isNumber(segment)) : [],
    message: 'message' in issue && isString(issue.message) ? issue.message : 'Invalid value'
  }));
};

export const bodyWithField = ({ body, field }: BodyWithFieldInput): Record<PropertyKey, unknown> | null =>
  isPlainObject(body) && field in body ? body : null;

export const retryAfterSeconds = (header: unknown): number | undefined => {
  const seconds = Number(header);

  return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds) : undefined;
};
