import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { createParamDecorator } from '@nestjs/common';

export const UserAgent = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => ctx.switchToHttp().getRequest<Request>().headers['user-agent']
);
