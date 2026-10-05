import type { ExecutionContext } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';

import { createParamDecorator } from '@nestjs/common';

export const OptionalUserId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => ctx.switchToHttp().getRequest<{ session?: UserSession | null }>().session?.user.id ?? null
);
