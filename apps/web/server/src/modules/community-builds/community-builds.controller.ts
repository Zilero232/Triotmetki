import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OptionalUserId } from '../../common/decorators';
import { IdParamsDto, LikeResultDto } from '../community-core';
import { BuildDto, BuildListDto, BuildPageDto, BuildsQueryDto, CreateBuildDto, TankParamsDto, UpdateBuildDto } from './dto/community-builds.dto';
import { BuildShareWriterService } from './services/build-share-writer.service';

@ApiTags('community')
@Controller('community/builds')
export class CommunityBuildsController {
  constructor(private readonly builds: BuildShareWriterService) {}

  @OptionalAuth()
  @Get()
  @ZodResponse({ type: BuildPageDto })
  list(@Query() query: BuildsQueryDto, @OptionalUserId() viewerUserId: string | null) {
    return this.builds.list({ ...query, viewerUserId });
  }

  @OptionalAuth()
  @Get('popular/:id')
  @ZodResponse({ type: BuildListDto })
  popular(@Param() { id }: TankParamsDto, @OptionalUserId() viewerUserId: string | null) {
    return this.builds.popular({ tankId: id, viewerUserId });
  }

  @OptionalAuth()
  @Get(':id')
  @ZodResponse({ type: BuildDto })
  get(@Param() { id }: IdParamsDto, @OptionalUserId() viewerUserId: string | null) {
    return this.builds.get({ id, viewerUserId });
  }

  @Post()
  @ZodResponse({ type: BuildDto, status: HttpStatus.CREATED })
  create(@CurrentUserId() userId: string, @Body() body: CreateBuildDto) {
    return this.builds.create({ ...body, userId });
  }

  @Patch(':id')
  @ZodResponse({ type: BuildDto })
  update(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto, @Body() body: UpdateBuildDto) {
    return this.builds.update({ ...body, id, userId });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    await this.builds.remove({ id, userId });
  }

  @Put(':id/like')
  @ZodResponse({ type: LikeResultDto })
  like(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    return this.builds.like({ id, userId, liked: true });
  }

  @Delete(':id/like')
  @ZodResponse({ type: LikeResultDto })
  unlike(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    return this.builds.like({ id, userId, liked: false });
  }
}
