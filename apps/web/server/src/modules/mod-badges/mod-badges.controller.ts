import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { modBadgePreferenceSchema, modBadgesRequestSchema } from '@otmetki/schemas';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { ModException } from '../../common/exceptions';
import { ModDeviceService, modDeviceTracker } from '../mod';
import { MOD_BADGES_API } from './config/mod-badges.constants';
import { ModBadgePreferenceAnswerDto, ModBadgePreferenceDto, ModBadgesDto, ModBadgesRequestDto } from './dto/mod-badges.dto';
import { ModBadgeQuotaWriterService } from './services/mod-badge-quota-writer.service';
import { ModBadgeWriterService } from './services/mod-badge-writer.service';
import { ModBadgesReaderService } from './services/mod-badges-reader.service';

@ApiTags('mod')
@AllowAnonymous()
@Controller('mod/badges')
export class ModBadgesController {
  constructor(
    private readonly devices: ModDeviceService,
    private readonly badges: ModBadgesReaderService,
    private readonly quota: ModBadgeQuotaWriterService,
    private readonly preferences: ModBadgeWriterService
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ...MOD_BADGES_API.readThrottle, getTracker: modDeviceTracker } })
  @ApiBody({ type: ModBadgesRequestDto })
  @ZodResponse({ type: ModBadgesDto })
  async badgesOf(@Req() request: RawBodyRequest<Request>) {
    const { device, body } = await this.devices.authenticateBody({ request, schema: modBadgesRequestSchema });
    const now = new Date();
    const retryAfterSeconds = await this.quota.claim({ subject: device.id, accountIds: body.account_ids, now });

    if (retryAfterSeconds !== null) {
      throw new ModException({
        status: HttpStatus.TOO_MANY_REQUESTS,
        error: 'rate_limited',
        message: 'Daily badge lookups are used up',
        retryAfterSeconds
      });
    }

    return this.badges.visible({ accountIds: body.account_ids, now });
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
