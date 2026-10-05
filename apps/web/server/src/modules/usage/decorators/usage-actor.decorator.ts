import type { ExecutionContext } from '@nestjs/common';

import { applyDecorators, createParamDecorator, UseGuards } from '@nestjs/common';

import type { UsageActor, UsageRequest } from '../usage.types';

import { UsageActorGuard } from '../guards/usage-actor.guard';

export const MeteredUsage = () => applyDecorators(UseGuards(UsageActorGuard));

export const CurrentUsageActor = createParamDecorator((_data: unknown, ctx: ExecutionContext): UsageActor => {
  const actor = ctx.switchToHttp().getRequest<UsageRequest>().usageActor;

  if (!actor) {
    throw new Error('CurrentUsageActor needs @MeteredUsage() on the handler');
  }

  return actor;
});
