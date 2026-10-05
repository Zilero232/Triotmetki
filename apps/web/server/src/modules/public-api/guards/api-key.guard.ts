import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Response } from 'express';

import { Injectable } from '@nestjs/common';
import { API_KEY } from '@otmetki/schemas';

import type { ApiRequest } from '../public-api.types';

import { AppTooManyRequestsException, AppUnauthorizedException } from '../../../common/exceptions';
import { ApiKeysWriterService } from '../../developer';
import { API_RATE_LIMIT } from '../config/public-api.constants';
import { endpointLabel } from '../lib/usage-counters/usage-counters';
import { ApiRateLimitService } from '../services/api-rate-limit.service';
import { ApiUsageWriterService } from '../services/api-usage-writer.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly keys: ApiKeysWriterService,
    private readonly limits: ApiRateLimitService,
    private readonly usage: ApiUsageWriterService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<ApiRequest>();
    const response = http.getResponse<Response>();
    const raw = request.header(API_KEY.header);

    if (!raw) {
      throw new AppUnauthorizedException('API_KEY_INVALID', `Pass your API key in the ${API_KEY.header} header`);
    }

    const ip = request.ip ?? API_RATE_LIMIT.failedKeys.unknownIp;

    try {
      await this.limits.assertKeyAttemptsLeft(ip);

      const key = await this.keys.verify(raw).catch(async (error: unknown) => {
        if (error instanceof AppUnauthorizedException) {
          await this.limits.chargeFailedKey(ip);
        }

        throw error;
      });

      response.setHeader(API_RATE_LIMIT.headers.dailyLimit, key.dailyLimit);
      response.setHeader(API_RATE_LIMIT.headers.dailyRemaining, key.dailyRemaining);
      request.apiKey = key;

      const { second, day } = await this.limits.consume(key);

      response.setHeader(API_RATE_LIMIT.headers.limit, second.limit);
      response.setHeader(API_RATE_LIMIT.headers.remaining, second.remaining);
      response.setHeader(API_RATE_LIMIT.headers.dailyLimit, Math.min(key.dailyLimit, day.limit));
      response.setHeader(API_RATE_LIMIT.headers.dailyRemaining, Math.min(key.dailyRemaining, day.remaining));
    } catch (error) {
      if (error instanceof AppTooManyRequestsException) {
        if (request.apiKey) {
          this.usage.recordThrottled({ keyId: request.apiKey.id, endpoint: endpointLabel({ method: request.method, route: request.route?.path }) });
        }

        if (error.retryAfterSec !== null) {
          response.setHeader(API_RATE_LIMIT.headers.retryAfter, error.retryAfterSec);
        }
      }

      throw error;
    }

    return true;
  }
}
