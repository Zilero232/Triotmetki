import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import type { Observable } from 'rxjs';

import { Inject, Injectable } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DEFAULT_IPV6_SUBNET_PREFIX, normalizeIp } from '@nestjs/throttler';
import { Redis } from 'ioredis';
import { rm } from 'node:fs/promises';
import { finalize } from 'rxjs';

import type { ReleaseUploadInput, UploadRequest } from './replay-file.interceptor.types';

import { AppTooManyRequestsException } from '../../../common/exceptions';
import { REDIS } from '../../../core';
import { MOD_DEVICE } from '../../mod';
import { REPLAY_UPLOAD } from '../config/upload.constants';

const ReplayMulterInterceptor = FileInterceptor(REPLAY_UPLOAD.field, {
  dest: REPLAY_UPLOAD.tempDir,
  limits: {
    fileSize: REPLAY_UPLOAD.maxBytes,
    files: 1,
    fields: REPLAY_UPLOAD.maxFields,
    fieldSize: REPLAY_UPLOAD.maxFieldBytes,
    parts: REPLAY_UPLOAD.maxFields + 1
  }
});

@Injectable()
export class ReplayFileInterceptor implements NestInterceptor {
  private readonly multer: NestInterceptor = new ReplayMulterInterceptor();

  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest<UploadRequest>();
    const slot = await this.claimSlot(request);

    try {
      const handled = await this.multer.intercept(context, next);

      return handled.pipe(finalize(() => void this.release({ slot, request })));
    } catch (error) {
      await this.release({ slot, request });

      throw error;
    }
  }

  private async claimSlot(request: UploadRequest): Promise<string> {
    const slot = `${REPLAY_UPLOAD.concurrency.keyPrefix}${this.ownerOf(request)}`;
    const results = await this.redis.multi().incr(slot).expire(slot, REPLAY_UPLOAD.concurrency.ttlSeconds).exec();
    const uploading = Number(results?.[0]?.[1] ?? 0);

    if (uploading > REPLAY_UPLOAD.concurrency.perOwner) {
      await this.redis.decr(slot);

      throw new AppTooManyRequestsException('RATE_LIMITED', 'Another replay upload is still in progress');
    }

    return slot;
  }

  private async release({ slot, request }: ReleaseUploadInput): Promise<void> {
    await Promise.allSettled([this.redis.decr(slot), request.file ? rm(request.file.path, { force: true }) : Promise.resolve()]);
  }

  private ownerOf(request: UploadRequest): string {
    const userId = request.session?.user.id;
    const device = request.header(MOD_DEVICE.header);

    if (userId) {
      return `user:${userId}`;
    }

    if (device) {
      return `device:${device}`;
    }

    return `ip:${normalizeIp(request.ip ?? '', DEFAULT_IPV6_SUBNET_PREFIX)}`;
  }
}
