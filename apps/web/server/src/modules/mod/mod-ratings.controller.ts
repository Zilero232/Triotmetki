import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { modRatingsRequestSchema, modTankRatingsRequestSchema } from '@otmetki/schemas';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { MOD_RATINGS_READ } from './config';
import { ModOverviewDto, ModRatingsRequestDto, ModTankRatingsDto, ModTankRatingsRequestDto } from './dto';
import { modDeviceTracker } from './lib';
import { ModDeviceService, ModRatingsService } from './services';

@ApiTags('mod')
@AllowAnonymous()
@Throttle({ default: { ...MOD_RATINGS_READ.throttle, getTracker: modDeviceTracker } })
@Controller('mod/me')
export class ModRatingsController {
  constructor(
    private readonly devices: ModDeviceService,
    private readonly ratings: ModRatingsService
  ) {}

  @Post('overview')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ModRatingsRequestDto })
  @ZodResponse({ type: ModOverviewDto })
  async overview(@Req() request: RawBodyRequest<Request>) {
    const { device } = await this.devices.authenticateBody({ request, schema: modRatingsRequestSchema });

    return this.ratings.overview(device.accountId);
  }

  @Post('tanks')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ModTankRatingsRequestDto })
  @ZodResponse({ type: ModTankRatingsDto })
  async tanks(@Req() request: RawBodyRequest<Request>) {
    const { device, body } = await this.devices.authenticateBody({ request, schema: modTankRatingsRequestSchema });

    return this.ratings.tanks({ accountId: device.accountId, tankIds: body.tank_ids });
  }
}
