import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { modBadgePreferenceSchema, modBadgesRequestSchema } from '@otmetki/schemas';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { ModDeviceService, modDeviceTracker } from '../mod';
import { MOD_BADGES_API } from './config/mod-badges.constants';
import { ModBadgePreferenceAnswerDto, ModBadgePreferenceDto, ModBadgesDto, ModBadgesRequestDto } from './dto/mod-badges.dto';
import { ModBadgeWriterService } from './services/mod-badge-writer.service';
import { ModBadgesReaderService } from './services/mod-badges-reader.service';

@ApiTags('mod')
@AllowAnonymous()
@Controller('mod/badges')
export class ModBadgesController {
  constructor(
    private readonly devices: ModDeviceService,
    private readonly badges: ModBadgesReaderService,
    private readonly preferences: ModBadgeWriterService
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ...MOD_BADGES_API.readThrottle, getTracker: modDeviceTracker } })
  @ApiBody({ type: ModBadgesRequestDto })
  @ZodResponse({ type: ModBadgesDto })
  async badgesOf(@Req() request: RawBodyRequest<Request>) {
    const { body } = await this.devices.authenticateBody({ request, schema: modBadgesRequestSchema });

    return this.badges.visible({ accountIds: body.account_ids, now: new Date() });
  }

  @Post('preference')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ...MOD_BADGES_API.preferenceThrottle, getTracker: modDeviceTracker } })
  @ApiBody({ type: ModBadgePreferenceDto })
  @ZodResponse({ type: ModBadgePreferenceAnswerDto })
  async preference(@Req() request: RawBodyRequest<Request>) {
    const { device, body } = await this.devices.authenticateBody({ request, schema: modBadgePreferenceSchema });

    return this.preferences.savePreference({ device, visible: body.visible });
  }
}
