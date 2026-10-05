import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { PlusFeature } from '@otmetki/schemas';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { AppForbiddenException, AppUnauthorizedException } from '../../../common/exceptions';
import { PLUS_GUARD } from '../config/plus-guard.constants';
import { EntitlementsService } from '../services/entitlements.service';

@Injectable()
export class PlusGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly entitlements: EntitlementsService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<PlusFeature | undefined>(PLUS_GUARD.featureKey, [context.getHandler(), context.getClass()]);

    if (!feature) {
      return true;
    }

    const userId = context.switchToHttp().getRequest<{ session?: UserSession | null }>().session?.user.id;

    if (!userId) {
      throw new AppUnauthorizedException('UNAUTHORIZED', 'Authentication required');
    }

    if (!(await this.entitlements.isPlus(userId))) {
      throw new AppForbiddenException('SUBSCRIPTION_REQUIRED', `${feature} needs Plus`, { feature });
    }

    return true;
  }
}
