import type { CallHandler } from '@nestjs/common';

import { Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';
import { finalize, from, switchMap } from 'rxjs';

import type { ModUploadRequest, UploadHandlerInput } from './replay-file.interceptor.types';

import { REDIS } from '../../../core';
import { MOD_DEVICE, ModDeviceService } from '../../mod';
import { REPLAY_UPLOAD } from '../config/upload.constants';
import { fileDigest } from '../lib/replay-file/replay-file';
import { ReplayFileInterceptor } from './replay-file.interceptor';

@Injectable()
export class ModReplayFileInterceptor extends ReplayFileInterceptor {
  constructor(
    @Inject(REDIS) redis: Redis,
    private readonly devices: ModDeviceService
  ) {
    super(redis);
  }

  protected override handlerOf({ request, next }: UploadHandlerInput): CallHandler {
    return {
      handle: () => from(this.authenticate(request)).pipe(switchMap((slot) => next.handle().pipe(finalize(() => void this.releaseSlot(slot)))))
    };
  }

  protected override ownerOf(request: ModUploadRequest): string {
    return `device:${request.header(MOD_DEVICE.header) ?? ''}:${this.networkOf(request)}`;
  }

  private async authenticate(request: ModUploadRequest): Promise<string> {
    const signer = this.devices.signer({ request, signedHeaders: [REPLAY_UPLOAD.visibilityHeader] });
    const digest = request.file ? await fileDigest({ hash: signer, path: request.file.path }) : undefined;
    const device = await this.devices.authenticateDigest({ request, digest });
    const slot = await this.claimSlot(`device:${device.id}`);

    request.modDevice = device;

    return slot;
  }
}
