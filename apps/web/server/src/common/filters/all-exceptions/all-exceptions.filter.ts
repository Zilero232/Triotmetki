import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';

import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { modErrorCodeSchema } from '@otmetki/schemas';
import { getUnixTime } from 'date-fns';
import { ZodSerializationException, ZodValidationException } from 'nestjs-zod';
import { STATUS_CODES } from 'node:http';
import { isIncludedIn } from 'remeda';

import type { ReplyInput } from './all-exceptions.types';

import { isPrismaRequestError } from '../../../core';
import { LestaNotConfiguredError } from '../../../lib/lesta';
import { errorMessage } from '../../lib';
import { LESTA_NOT_CONNECTED, MOD_REPLY, PRISMA_TO_HTTP } from './all-exceptions.constants';
import {
  bodyWithField,
  codeForStatus,
  isLestaError,
  middlewareStatus,
  modErrorForStatus,
  retryAfterSeconds,
  zodIssues
} from './lib/exception-reply/exception-reply';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    if (MOD_REPLY.pathPrefixes.some((prefix) => request.path.startsWith(prefix))) {
      response.setHeader(MOD_REPLY.serverTimeHeader, String(getUnixTime(new Date())));
    }

    if (isIncludedIn(request.path, MOD_REPLY.contractPaths)) {
      this.replyMod({ exception, response });

      return;
    }

    this.replyApi({ exception, response });
  }

  private replyApi({ exception, response }: ReplyInput) {
    if (exception instanceof ZodValidationException) {
      response
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: 'Validation failed', code: 'VALIDATION_FAILED', issues: zodIssues(exception.getZodError()) });

      return;
    }

    if (exception instanceof ThrottlerException) {
      const retryAfterSec = retryAfterSeconds(response.getHeader('Retry-After'));

      response
        .status(HttpStatus.TOO_MANY_REQUESTS)
        .json({ error: 'Too many requests', code: 'RATE_LIMITED', ...(retryAfterSec ? { retryAfterSec } : {}) });

      return;
    }

    if (exception instanceof ZodSerializationException) {
      this.logger.error(`response failed its schema: ${JSON.stringify(zodIssues(exception.getZodError()))}`);
      response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });

      return;
    }

    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const status = exception.getStatus();

      const modBody = bodyWithField({ body, field: 'error' });
      const fallback =
        modBody !== null && modErrorCodeSchema.safeParse(modBody.error).success ? { ...modBody, code: codeForStatus(status) } : undefined;

      response.status(status).json(bodyWithField({ body, field: 'code' }) ?? fallback ?? { error: exception.message, code: codeForStatus(status) });

      return;
    }

    if (exception instanceof LestaNotConfiguredError) {
      response.status(LESTA_NOT_CONNECTED.status).json({ error: LESTA_NOT_CONNECTED.error, code: LESTA_NOT_CONNECTED.code });

      return;
    }

    if (isLestaError(exception)) {
      this.logger.warn(errorMessage(exception));
      response.status(HttpStatus.SERVICE_UNAVAILABLE).json({ error: 'Lesta API is unavailable', code: 'LESTA_UNAVAILABLE' });

      return;
    }

    const mapped = isPrismaRequestError(exception) ? PRISMA_TO_HTTP[exception.code] : undefined;

    if (mapped) {
      response.status(mapped.status).json({ error: mapped.code, code: mapped.code });

      return;
    }

    const status = middlewareStatus(exception);

    if (status) {
      response.status(status).json({ error: STATUS_CODES[status] ?? 'Bad request', code: codeForStatus(status) });

      return;
    }

    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  }

  private replyMod({ exception, response }: ReplyInput) {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const status = exception.getStatus();
      const modBody = bodyWithField({ body, field: 'error' });
      const isModBody = modBody !== null && modErrorCodeSchema.safeParse(modBody.error).success;

      response.status(status).json(isModBody ? body : { error: modErrorForStatus(status) });

      return;
    }

    const status = middlewareStatus(exception);

    if (status) {
      response.status(status).json({ error: modErrorForStatus(status) });

      return;
    }

    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: 'server_error' });
  }
}
