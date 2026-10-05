import type { RawBodyRequest } from '@nestjs/common';

import { Controller, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { modApplyResultSchema, modDeviceRequestSchema, modSettingsExportSchema } from '@otmetki/schemas';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { Request } from 'express';
import { ZodResponse } from 'nestjs-zod';

import { ModDeviceService } from '../../mod';
import { IdParamsDto } from '../dto/params.dto';
import { STREAMERS } from '../profiles';
import { ModApplyListDto } from './dto/settings.dto';
import { SettingsShareService } from './services/settings-share.service';

@ApiTags('mod')
@AllowAnonymous()
@Throttle({ default: STREAMERS.modThrottle })
@Controller('mod/settings')
export class ModSettingsController {
  constructor(
    private readonly devices: ModDeviceService,
    private readonly shares: SettingsShareService
  ) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  async export(@Req() request: RawBodyRequest<Request>) {
    const { device, body } = await this.devices.authenticateBody({ request, schema: modSettingsExportSchema });

    await this.shares.ingestExport({ device, body });
  }

  @Post('apply/poll')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: ModApplyListDto })
  async poll(@Req() request: RawBodyRequest<Request>) {
    const { device } = await this.devices.authenticateBody({ request, schema: modDeviceRequestSchema });

    return this.shares.pendingForDevice(device);
  }

  @Post('apply/:id/result')
  @HttpCode(HttpStatus.NO_CONTENT)
  async result(@Req() request: RawBodyRequest<Request>, @Param() { id }: IdParamsDto) {
    const { device, body } = await this.devices.authenticateBody({ request, schema: modApplyResultSchema });

    await this.shares.applyResult({ device, id, status: body.status });
  }
}
