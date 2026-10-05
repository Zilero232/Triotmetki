import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { Injectable } from '@nestjs/common';

import { AppConfigService, guardedOrigins } from '../../config';
import { AppForbiddenException } from '../exceptions';
import { isCrossOriginStateChange } from '../lib';

@Injectable()
export class OriginGuard implements CanActivate {
  private readonly allowed: string[];

  constructor(config: AppConfigService) {
    this.allowed = guardedOrigins({ API_URL: config.get('API_URL'), CORS_ORIGINS: config.get('CORS_ORIGINS'), WEB_URL: config.get('WEB_URL') });
  }

  canActivate(context: ExecutionContext): boolean {
    if (context.getType() !== 'http') {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const header = (name: string) => {
      const value = request.headers[name];

      return typeof value === 'string' ? value : undefined;
    };

    const foreign = isCrossOriginStateChange({
      method: request.method,
      origin: header('origin'),
      fetchSite: header('sec-fetch-site'),
      cookie: header('cookie'),
      allowed: this.allowed
    });

    if (foreign) {
      throw new AppForbiddenException('FORBIDDEN', 'Cross-origin request refused');
    }

    return true;
  }
}
