import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { BlockList } from 'node:net';

import { Injectable } from '@nestjs/common';

import { AppForbiddenException } from '../../../common/exceptions';
import { AppConfigService, isProduction } from '../../../config';
import { LOOPBACK_CIDRS, YOOKASSA_CIDRS } from '../config/webhook.constants';
import { buildAllowList, isAllowedIp } from '../lib/webhook-ip/webhook-ip';

@Injectable()
export class WebhookIpGuard implements CanActivate {
  private readonly list: BlockList;

  constructor(config: AppConfigService) {
    const cidrs = isProduction({ NODE_ENV: config.get('NODE_ENV') }) ? YOOKASSA_CIDRS : [...YOOKASSA_CIDRS, ...LOOPBACK_CIDRS];

    this.list = buildAllowList(cidrs);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const ip = request.ip ?? request.socket.remoteAddress ?? '';

    if (!isAllowedIp({ list: this.list, ip })) {
      throw new AppForbiddenException('FORBIDDEN', 'Webhook source is not allowed');
    }

    return true;
  }
}
