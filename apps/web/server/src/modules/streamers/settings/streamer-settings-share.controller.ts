import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OperationIdPrefix } from '../../../common/decorators';
import {
  ApplyListDto,
  ApplyRequestDto,
  CreateApplyRequestDto,
  SettingsShareDto,
  SettingsShareResponseDto,
  UpdateSettingsShareDto
} from './dto/settings.dto';
import { SettingsShareService } from './services/settings-share.service';

@ApiTags('streamers')
@OperationIdPrefix('StreamersController')
@Controller('streamers')
export class StreamerSettingsShareController {
  constructor(private readonly shares: SettingsShareService) {}

  @Get('me/settings/apply')
  @ZodResponse({ type: ApplyListDto })
  applyRequests(@CurrentUserId() userId: string) {
    return this.shares.myRequests(userId);
  }

  @Post('me/settings/apply')
  @ZodResponse({ type: ApplyRequestDto, status: HttpStatus.CREATED })
  requestApply(@CurrentUserId() userId: string, @Body() body: CreateApplyRequestDto) {
    return this.shares.requestApply({ ...body, userId });
  }

  @Get('me/settings/share')
  @ZodResponse({ type: SettingsShareResponseDto })
  async settingsShare(@CurrentUserId() userId: string) {
    return { share: await this.shares.share(userId) };
  }

  @Put('me/settings/share')
  @ZodResponse({ type: SettingsShareDto })
  updateSettingsShare(@CurrentUserId() userId: string, @Body() { anonymousStats }: UpdateSettingsShareDto) {
    return this.shares.setAnonymous({ userId, anonymousStats });
  }

  @Delete('me/settings/share')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSettingsShare(@CurrentUserId() userId: string) {
    await this.shares.removeShare(userId);
  }
}
