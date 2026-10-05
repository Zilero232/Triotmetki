import { Body, Controller, Get, Header, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import type { VkCallbackBody } from './vk.types';

import { VkStatusDto } from './dto/vk.dto';
import { VkBotService } from './services/vk-bot.service';
import { VkStatusReaderService } from './services/vk-status-reader.service';

@ApiTags('vk')
@Controller('vk')
export class VkController {
  constructor(
    private readonly bot: VkBotService,
    private readonly statuses: VkStatusReaderService
  ) {}

  @AllowAnonymous()
  @Get('status')
  @ZodResponse({ type: VkStatusDto })
  status() {
    return this.statuses.status();
  }

  @ApiExcludeEndpoint()
  @AllowAnonymous()
  @SkipThrottle()
  @Post('callback')
  @HttpCode(HttpStatus.OK)
  @Header('content-type', 'text/plain')
  callback(@Body() body: VkCallbackBody): Promise<string> {
    return this.bot.handleCallback(body);
  }
}
