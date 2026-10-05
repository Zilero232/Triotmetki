import type { CanActivate, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import { Injectable } from '@nestjs/common';

import { AppBadRequestException } from '../../../common/exceptions';
import { MOD_DEVICE, ModDeviceService } from '../../mod';
import { REPLAY_UPLOAD } from '../config/upload.constants';

@Injectable()
export class ModDeviceGuard implements CanActivate {
  constructor(private readonly devices: ModDeviceService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const declared = Number(request.header('content-length') ?? Number.NaN);

    if (Number.isFinite(declared) && declared > REPLAY_UPLOAD.maxBytes + REPLAY_UPLOAD.multipartOverheadBytes) {
      throw new AppBadRequestException('REPLAY_INVALID', 'The replay is too large');
    }

    await this.devices.identify({ deviceId: request.header(MOD_DEVICE.header), signature: request.header(MOD_DEVICE.signatureHeader) });

    return true;
  }
}
