import type { Request, Response } from 'express';

import { Body, Controller, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { ModException } from '../../common/exceptions';
import { MOD_BADGES_API } from './config/mod-badges.constants';
import { ModBadgePresenceRequestDto, ModBadgesDto } from './dto/mod-badges.dto';
import { presenceTracker } from './lib/badge-presence/badge-presence';
import { ModBadgePresenceReaderService } from './services/mod-badge-presence-reader.service';
import { ModBadgePresenceWriterService } from './services/mod-badge-presence-writer.service';
import { ModBadgeQuotaWriterService } from './services/mod-badge-quota-writer.service';

@ApiTags('mod')
@AllowAnonymous()
@Controller('mod/badges/presence')
export class ModBadgePresenceController {
  constructor(
    private readonly presences: ModBadgePresenceReaderService,
    private readonly presenceWriter: ModBadgePresenceWriterService,
    private readonly quota: ModBadgeQuotaWriterService
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ...MOD_BADGES_API.presenceThrottle, getTracker: presenceTracker } })
  @ApiBody({ type: ModBadgePresenceRequestDto })
  @ZodResponse({ type: ModBadgesDto })
  async presence(@Body() body: ModBadgePresenceRequestDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.presenceWriter.report({ accountId: body.account_id, visible: body.visible });

    if (body.account_ids.length === 0) {
      return { account_ids: [] };
    }

    const retryAfterSec = await this.quota.claimForClient({ ip: request.ip, accountIds: body.account_ids, now: new Date() });

    if (retryAfterSec !== null) {
      response.setHeader('Retry-After', String(retryAfterSec));

      throw new ModException({ status: HttpStatus.TOO_MANY_REQUESTS, error: 'rate_limited', message: 'Daily badge lookups are used up' });
    }

    return this.presences.visible(body.account_ids);
  }
}
