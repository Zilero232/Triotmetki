import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { modSessionSharePreferenceSchema, modSessionShareSendSchema } from '@otmetki/schemas';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { ModDeviceService } from '../mod';
import { SESSION_SHARE } from './config/session-share.constants';
import {
  ModSessionSharePreferenceAnswerDto,
  ModSessionSharePreferenceDto,
  ModSessionShareSendDto,
  ModSessionShareSentDto
} from './dto/session-share.dto';
import { SessionShareWriterService } from './services/session-share-writer.service';

@ApiTags('mod')
@AllowAnonymous()
@Controller('mod/me/session-share')
export class SessionShareController {
  constructor(
    private readonly devices: ModDeviceService,
    private readonly shares: SessionShareWriterService
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: SESSION_SHARE.preferenceThrottle })
  @ApiBody({ type: ModSessionSharePreferenceDto })
  @ZodResponse({ type: ModSessionSharePreferenceAnswerDto })
  async preference(@Req() request: RawBodyRequest<Request>) {
    const { device, body } = await this.devices.authenticateBody({ request, schema: modSessionSharePreferenceSchema });

    return this.shares.savePreference({ userId: device.userId, accountId: device.accountId, enabled: body.enabled, channels: body.channels });
  }

  @Post('send')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: SESSION_SHARE.sendThrottle })
  @ApiBody({ type: ModSessionShareSendDto })
  @ZodResponse({ type: ModSessionShareSentDto, status: HttpStatus.ACCEPTED })
  async send(@Req() request: RawBodyRequest<Request>) {
    const { device, body } = await this.devices.authenticateBody({ request, schema: modSessionShareSendSchema });

    return this.shares.send({ userId: device.userId, accountId: device.accountId, modSessionId: body.session_id, channels: body.channels });
  }
}
