import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OperationIdPrefix } from '../../../common/decorators';
import { SlugParamsDto } from '../dto/params.dto';
import { FollowStreamerDto, StreamerFollowListDto } from './dto/profiles.dto';
import { StreamerFollowWriterService } from './services/streamer-follow-writer.service';

@ApiTags('streamers')
@OperationIdPrefix('StreamersController')
@Controller('streamers')
export class StreamerFollowsController {
  constructor(private readonly follows: StreamerFollowWriterService) {}

  @Get('me/follows')
  @ZodResponse({ type: StreamerFollowListDto })
  myFollows(@CurrentUserId() userId: string) {
    return this.follows.list(userId);
  }

  @Put(':slug/follow')
  @ZodResponse({ type: StreamerFollowListDto })
  follow(@CurrentUserId() userId: string, @Param() { slug }: SlugParamsDto, @Body() { tankId }: FollowStreamerDto) {
    return this.follows.follow({ userId, slug, tankId });
  }

  @Delete(':slug/follow')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unfollow(@CurrentUserId() userId: string, @Param() { slug }: SlugParamsDto) {
    await this.follows.unfollow({ userId, slug });
  }
}
