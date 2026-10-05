import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OptionalUserId } from '../../common/decorators';
import {
  CompetitionAccessQueryDto,
  CompetitionDto,
  CompetitionIdParamsDto,
  CompetitionPageDto,
  CompetitionSlugParamsDto,
  CompetitionsQueryDto,
  CreateCompetitionDto,
  JoinCompetitionDto
} from './dto/competitions.dto';
import { CompetitionReaderService } from './services/competition-reader.service';
import { CompetitionWriterService } from './services/competition-writer.service';

@ApiTags('competitions')
@Controller('competitions')
export class CompetitionsController {
  constructor(
    private readonly reader: CompetitionReaderService,
    private readonly writer: CompetitionWriterService
  ) {}

  @OptionalAuth()
  @Get()
  @ZodResponse({ type: CompetitionPageDto })
  list(@Query() query: CompetitionsQueryDto, @OptionalUserId() viewerUserId: string | null) {
    return this.reader.list({ query, viewerUserId });
  }

  @OptionalAuth()
  @Get(':slug')
  @ZodResponse({ type: CompetitionDto })
  get(@Param() { slug }: CompetitionSlugParamsDto, @Query() { code }: CompetitionAccessQueryDto, @OptionalUserId() viewerUserId: string | null) {
    return this.reader.get({ slug, viewerUserId, code });
  }

  @Post()
  @ZodResponse({ type: CompetitionDto, status: HttpStatus.CREATED })
  create(@CurrentUserId() userId: string, @Body() body: CreateCompetitionDto) {
    return this.writer.create({ ...body, userId });
  }

  @Post(':id/join')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: CompetitionDto })
  join(@CurrentUserId() userId: string, @Param() { id }: CompetitionIdParamsDto, @Body() body: JoinCompetitionDto) {
    return this.writer.join({ ...body, id, userId });
  }

  @Post(':id/leave')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: CompetitionDto })
  leave(@CurrentUserId() userId: string, @Param() { id }: CompetitionIdParamsDto) {
    return this.writer.leave({ id, userId });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUserId() userId: string, @Param() { id }: CompetitionIdParamsDto) {
    await this.writer.remove({ id, userId });
  }
}
