import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';

import { Inject, Injectable } from '@nestjs/common';
import { DEFAULT_IPV6_SUBNET_PREFIX, normalizeIp } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { rm } from 'node:fs/promises';
import { finalize } from 'rxjs';

import type { ReleaseUploadInput, UploadHandlerInput, UploadRequest } from './replay-file.interceptor.types';

import { AppTooManyRequestsException } from '../../../common/exceptions';
import { REDIS } from '../../../core';
import { REPLAY_UPLOAD } from '../config/upload.constants';
import { claimUploadSlot, releaseUploadSlot } from '../lib/upload-slot/upload-slot';
import { ReplayMulterInterceptor } from './replay-multer.interceptor';

@Injectable()
export class ReplayFileInterceptor implements NestInterceptor {
  private readonly multer: NestInterceptor = new ReplayMulterInterceptor();

  constructor(@Inject(REDIS) protected readonly redis: Redis) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<UploadRequest>();
    const slot = await this.claimSlot(this.ownerOf(request));

    try {
      const handled = await this.multer.intercept(context, this.handlerOf({ request, next }));

      return handled.pipe(finalize(() => void this.release({ slot, request })));
    } catch (error) {
      await this.release({ slot, request });

      throw error;
    }
  }

  protected handlerOf({ next }: UploadHandlerInput): CallHandler {
    return next;
  }

  protected ownerOf(request: UploadRequest): string {
    const userId = request.session?.user.id;

    return userId ? `user:${userId}` : `ip:${this.networkOf(request)}`;
  }

  protected networkOf(request: UploadRequest): string {
    return normalizeIp(request.ip ?? '', DEFAULT_IPV6_SUBNET_PREFIX);
  }

  protected async claimSlot(owner: string): Promise<string> {
    const slot = `${REPLAY_UPLOAD.concurrency.keyPrefix}${owner}`;
    const claimed = await claimUploadSlot({
      redis: this.redis,
      key: slot,
      limit: REPLAY_UPLOAD.concurrency.perOwner,
      ttlSeconds: REPLAY_UPLOAD.concurrency.ttlSeconds
    });

    if (!claimed) {
      throw new AppTooManyRequestsException('RATE_LIMITED', 'Another replay upload is still in progress');
    }

    return slot;
  }

  protected async releaseSlot(slot: string): Promise<void> {
    await releaseUploadSlot({ redis: this.redis, key: slot });
  }

  private async release({ slot, request }: ReleaseUploadInput): Promise<void> {
    await Promise.allSettled([this.releaseSlot(slot), request.file ? rm(request.file.path, { force: true }) : Promise.resolve()]);
  }
}
