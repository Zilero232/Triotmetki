import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';

import { Injectable } from '@nestjs/common';
import { catchError, tap, throwError } from 'rxjs';

import type { ApiRequest } from '../public-api.types';

import { errorStatus } from '../lib/error-status/error-status';
import { endpointLabel } from '../lib/usage-counters/usage-counters';
import { ApiUsageWriterService } from '../services/api-usage-writer.service';

@Injectable()
export class ApiUsageInterceptor implements NestInterceptor {
  constructor(private readonly usage: ApiUsageWriterService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<ApiRequest>();
    const key = request.apiKey;

    if (!key) {
      return next.handle();
    }

    const startedAt = performance.now();
    const endpoint = endpointLabel({ method: request.method, route: request.route?.path });

    return next.handle().pipe(
      tap(() => {
        this.usage.record({ keyId: key.id, endpoint, latencyMs: performance.now() - startedAt, failed: false });
      }),
      catchError((error: unknown) => {
        const { status, code } = errorStatus(error);

        this.usage.record({ keyId: key.id, endpoint, latencyMs: performance.now() - startedAt, failed: true });

        this.usage.logError({
          keyId: key.id,
          method: request.method,
          path: request.path,
          status,
          code,
          message: error instanceof Error ? error.message : null
        });

        return throwError(() => error);
      })
    );
  }
}
