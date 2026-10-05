import type { RawBodyRequest } from '@nestjs/common';
import type { Request, Response } from 'express';

import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Ip, Param, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { BIND_CODE } from './config/bind-code.constants';
import { MOD_INGEST } from './config/ingest.constants';
import { BindCodeDto, BindCodeInputDto, BindRequestDto, BindResponseDto, DeviceParamsDto, IngestResponseDto, ModDevicesDto } from './dto/mod.dto';
import { ingestBatchSchema } from './lib/contract/contract.schemas';
import { modDeviceTracker } from './lib/device-tracker/device-tracker';
import { ModBindWriterService } from './services/mod-bind-writer.service';
import { ModDeviceService } from './services/mod-device.service';
import { ModIngestWriterService } from './services/mod-ingest-writer.service';

@ApiTags('mod')
@Controller('mod')
export class ModController {
  constructor(
    private readonly binding: ModBindWriterService,
    private readonly devices: ModDeviceService,
    private readonly ingestion: ModIngestWriterService
  ) {}

  @Post('bind-code')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: BindCodeDto })
  issueCode(@CurrentUserId() userId: string, @Body() { accountId }: BindCodeInputDto) {
    return this.binding.issueCode({ userId, accountId });
  }

  @AllowAnonymous()
  @Throttle({ default: BIND_CODE.throttle })
  @Post('bind')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: BindRequestDto })
  @ZodResponse({ type: BindResponseDto })
  bind(@Body() body: unknown, @Ip() requester: string) {
    return this.binding.bind({ body, requester });
  }

  @AllowAnonymous()
  @Throttle({ default: { ...MOD_INGEST.throttle, getTracker: modDeviceTracker } })
  @Post('ingest')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: IngestResponseDto })
  async ingest(@Req() request: RawBodyRequest<Request>, @Res({ passthrough: true }) response: Response) {
    const { device, body: batch } = await this.devices.authenticateBody({ request, schema: ingestBatchSchema });

    const result = await this.ingestion.ingest({ device, batch });

    if (result.accepted === 0 && result.duplicates === batch.events.length) {
      response.status(HttpStatus.CONFLICT);
    }

    return result;
  }

  @Get('devices')
  @ZodResponse({ type: ModDevicesDto })
  list(@CurrentUserId() userId: string) {
    return this.devices.list(userId);
  }

  @Delete('devices/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@CurrentUserId() userId: string, @Param() { id }: DeviceParamsDto) {
    await this.devices.revoke({ userId, deviceId: id });
  }
}
