import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { WEB_LOGIN } from './config/web-login.constants';
import { TelegramLinkCodeDto, TelegramSessionTokenDto, TelegramStatusDto, TelegramWebLoginDto } from './dto/telegram.dto';
import { TelegramLinkWriterService } from './services/telegram-link-writer.service';

@ApiTags('telegram')
@Controller()
export class TelegramLinkController {
  constructor(private readonly links: TelegramLinkWriterService) {}

  @Get('me/telegram')
  @ZodResponse({ type: TelegramStatusDto })
  status(@CurrentUserId() userId: string) {
    return this.links.status(userId);
  }

  @Post('me/telegram/code')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: TelegramLinkCodeDto })
  issueCode(@CurrentUserId() userId: string) {
    return this.links.issueCode(userId);
  }

  @Delete('me/telegram')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlink(@CurrentUserId() userId: string) {
    await this.links.unlink(userId);
  }

  @AllowAnonymous()
  @Throttle({ default: WEB_LOGIN.throttle })
  @Post('telegram/web-login')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: TelegramSessionTokenDto })
  async redeem(@Body() { code }: TelegramWebLoginDto) {
    return { token: await this.links.redeemWebLogin(code) };
  }
}
