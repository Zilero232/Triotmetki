import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous, OptionalAuth } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OptionalUserId } from '../../common/decorators';
import { IdParamsDto, LikeResultDto, SlugParamsDto } from '../community-core';
import { CreateGuideDto, GuideAuthorsDto, GuideDto, GuideListDto, GuidePageDto, GuidesQueryDto, UpdateGuideDto } from './dto/guides.dto';
import { GuideWriterService } from './services/guide-writer.service';

@ApiTags('community')
@Controller('community/guides')
export class GuidesController {
  constructor(private readonly guides: GuideWriterService) {}

  @OptionalAuth()
  @Get()
  @ZodResponse({ type: GuidePageDto })
  list(@Query() query: GuidesQueryDto, @OptionalUserId() viewerUserId: string | null) {
    return this.guides.list({ ...query, viewerUserId });
  }

  @AllowAnonymous()
  @Get('authors')
  @ZodResponse({ type: GuideAuthorsDto })
  authors() {
    return this.guides.topAuthors();
  }

  @Get('mine')
  @ZodResponse({ type: GuideListDto })
  mine(@CurrentUserId() userId: string) {
    return this.guides.mine(userId);
  }

  @OptionalAuth()
  @Get(':slug')
  @ZodResponse({ type: GuideDto })
  get(@Param() { slug }: SlugParamsDto, @OptionalUserId() viewerUserId: string | null) {
    return this.guides.bySlug({ slug, viewerUserId });
  }

  @Post()
  @ZodResponse({ type: GuideDto, status: HttpStatus.CREATED })
  create(@CurrentUserId() userId: string, @Body() body: CreateGuideDto) {
    return this.guides.create({ ...body, userId });
  }

  @Patch(':id')
  @ZodResponse({ type: GuideDto })
  update(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto, @Body() body: UpdateGuideDto) {
    return this.guides.update({ ...body, id, userId });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    await this.guides.remove({ id, userId });
  }

  @Put(':id/like')
  @ZodResponse({ type: LikeResultDto })
  like(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    return this.guides.like({ id, userId, liked: true });
  }

  @Delete(':id/like')
  @ZodResponse({ type: LikeResultDto })
  unlike(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    return this.guides.like({ id, userId, liked: false });
  }
}
