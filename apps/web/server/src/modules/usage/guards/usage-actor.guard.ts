import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request, Response } from 'express';

import { Injectable } from '@nestjs/common';
import { parseCookies } from 'better-auth/cookies';
import { nanoid } from 'nanoid';

import type { DeviceOfInput, UsageRequest } from '../usage.types';

import { AppConfigService, isProduction } from '../../../config';
import { USAGE_DEVICE } from '../config/usage-device.constants';
import { hashIp, readDeviceToken, signDeviceToken } from '../lib/device-token/device-token';

@Injectable()
export class UsageActorGuard implements CanActivate {
  constructor(private readonly config: AppConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & UsageRequest>();
    const secret = this.config.get('BETTER_AUTH_SECRET');
    const userId = request.session?.user.id ?? null;

    request.usageActor = {
      userId,
      deviceId: userId ? null : this.deviceOf({ request, response: http.getResponse<Response>(), secret }),
      ipHash: request.ip ? hashIp({ ip: request.ip, secret }) : null
    };

    return true;
  }

  private deviceOf({ request, response, secret }: DeviceOfInput): string {
    const known = readDeviceToken({ token: parseCookies(request.headers.cookie ?? '').get(USAGE_DEVICE.cookie), secret });

    if (known) {
      return known;
    }

    const deviceId = nanoid(USAGE_DEVICE.idLength);

    response.cookie(USAGE_DEVICE.cookie, signDeviceToken({ deviceId, secret }), {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction({ NODE_ENV: this.config.get('NODE_ENV') }),
      maxAge: USAGE_DEVICE.maxAgeMs,
      path: '/'
    });

    return deviceId;
  }
}
