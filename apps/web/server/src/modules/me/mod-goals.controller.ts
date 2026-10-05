import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { Controller, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBody, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { modGoalsRequestSchema } from '@otmetki/schemas';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { ModDeviceService } from '../mod';
import { MOD_GOALS } from './config/me.constants';
import { ModGoalsDto, ModGoalsRequestDto } from './dto/me.dto';
import { GoalsWriterService } from './services/goals-writer.service';

@ApiTags('mod')
@AllowAnonymous()
@Throttle({ default: MOD_GOALS.throttle })
@Controller('mod/me')
export class ModGoalsController {
  constructor(
    private readonly devices: ModDeviceService,
    private readonly goals: GoalsWriterService
  ) {}

  @Post('goals')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ type: ModGoalsRequestDto })
  @ZodResponse({ type: ModGoalsDto })
  async hangar(@Req() request: RawBodyRequest<Request>) {
    const { device } = await this.devices.authenticateBody({ request, schema: modGoalsRequestSchema });

    return this.goals.hangar({ userId: device.userId, accountId: device.accountId });
  }
}
