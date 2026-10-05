import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { UserSession } from '@thallesp/nestjs-better-auth';
import type { Observable } from 'rxjs';

import { CacheInterceptor } from '@nestjs/cache-manager';
import { Injectable } from '@nestjs/common';
import { from, lastValueFrom } from 'rxjs';

import { CACHE_BY_VIEWER } from '../cache';

@Injectable()
export class ViewerCacheInterceptor extends CacheInterceptor {
  private readonly inflight = new Map<string, Promise<unknown>>();

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const key = await this.trackBy(context);

    if (!key) {
      return super.intercept(context, next);
    }

    const pending = this.inflight.get(key);

    if (pending) {
      return from(pending);
    }

    const shared = super
      .intercept(context, next)
      .then(async (stream) => lastValueFrom(stream, { defaultValue: undefined }))
      .finally(() => this.inflight.delete(key));

    this.inflight.set(key, shared);

    return from(shared);
  }

  protected async trackBy(context: ExecutionContext): Promise<string | null | undefined> {
    const key = await super.trackBy(context);
    const isByViewer = this.reflector.get<boolean | undefined>(CACHE_BY_VIEWER, context.getHandler()) ?? false;
    const userId = context.switchToHttp().getRequest<{ session?: UserSession | null }>().session?.user.id;

    if (!key || !isByViewer || !userId) {
      return key;
    }

    return `${key}:viewer:${userId}`;
  }
}
