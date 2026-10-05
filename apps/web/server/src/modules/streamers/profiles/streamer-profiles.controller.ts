import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OperationIdPrefix, OptionalUserId } from '../../../common/decorators';
import { SlugParamsDto } from '../dto/params.dto';
import { STREAMERS } from './config/directory.constants';
import {
  RemovalRequestDto,
  StreamerDirectoryDto,
  StreamerDirectoryQueryDto,
  StreamerLiveListDto,
  StreamerProfileDto,
  UpsertProfileDto
} from './dto/profiles.dto';
import { StreamerDirectoryService } from './services/streamer-directory.service';
import { StreamerModerationService } from './services/streamer-moderation.service';
import { StreamerProfileService } from './services/streamer-profile.service';

@ApiTags('streamers')
@OperationIdPrefix('StreamersController')
@Controller('streamers')
export class StreamerProfilesController {
  constructor(
    private readonly profiles: StreamerProfileService,
    private readonly directory: StreamerDirectoryService,
    private readonly moderation: StreamerModerationService
  ) {}

  @AllowAnonymous()
  @Get()
  @ZodResponse({ type: StreamerDirectoryDto })
  list(@Query() query: StreamerDirectoryQueryDto) {
    return this.directory.list(query);
  }

  @AllowAnonymous()
  @Get('live')
  @ZodResponse({ type: StreamerLiveListDto })
  live() {
    return this.directory.live();
  }

  @Get('me')
  @ZodResponse({ type: StreamerProfileDto })
  profile(@CurrentUserId() userId: string) {
    return this.profiles.get(userId);
  }

  @Put('me')
  @ZodResponse({ type: StreamerProfileDto })
  saveProfile(@CurrentUserId() userId: string, @Body() body: UpsertProfileDto) {
    return this.profiles.upsert({ ...body, userId });
  }

  @AllowAnonymous()
  @Get(':slug')
  @ZodResponse({ type: StreamerProfileDto })
  bySlug(@Param() { slug }: SlugParamsDto) {
    return this.profiles.bySlug(slug);
  }

  @AllowAnonymous()
  @Throttle({ default: STREAMERS.removalThrottle })
  @Post(':slug/removal-request')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removalRequest(@Param() { slug }: SlugParamsDto, @Body() body: RemovalRequestDto, @OptionalUserId() userId: string | null) {
    await this.moderation.requestRemoval({ ...body, slug, userId });
  }
}
