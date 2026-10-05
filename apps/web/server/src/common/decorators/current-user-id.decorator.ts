import type { ExecutionContext } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { createParamDecorator } from '@nestjs/common';

import { AppUnauthorizedException } from '../exceptions';

export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest<{ session?: UserSession | null }>();
  const userId = request.session?.user.id;

  if (!userId) {
    throw new AppUnauthorizedException('UNAUTHORIZED', 'Authentication required');
  }

  return userId;
});
