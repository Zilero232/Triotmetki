import type { ApiErrorCode, ApiErrorDetails } from '@otmetki/schemas';

import { HttpException, HttpStatus } from '@nestjs/common';

import { errorBody } from './lib/error-body/error-body';

export class AppBadRequestException extends HttpException {
  constructor(code: ApiErrorCode, error: string) {
    super(errorBody({ code, error }), HttpStatus.BAD_REQUEST);
  }
}

export class AppUnauthorizedException extends HttpException {
  constructor(code: ApiErrorCode, error: string) {
    super(errorBody({ code, error }), HttpStatus.UNAUTHORIZED);
  }
}

export class AppForbiddenException extends HttpException {
  constructor(code: ApiErrorCode, error: string, details?: ApiErrorDetails) {
    super(errorBody({ code, error, details }), HttpStatus.FORBIDDEN);
  }
}

export class AppNotFoundException extends HttpException {
  constructor(code: ApiErrorCode, error: string) {
    super(errorBody({ code, error }), HttpStatus.NOT_FOUND);
  }
}

export class AppConflictException extends HttpException {
  constructor(code: ApiErrorCode, error: string, details?: ApiErrorDetails) {
    super(errorBody({ code, error, details }), HttpStatus.CONFLICT);
  }
}

export class AppTooManyRequestsException extends HttpException {
  constructor(
    code: ApiErrorCode,
    error: string,
    readonly retryAfterSec: number | null = null
  ) {
    super({ ...errorBody({ code, error }), ...(retryAfterSec === null ? {} : { retryAfterSec }) }, HttpStatus.TOO_MANY_REQUESTS);
  }
}
