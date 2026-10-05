import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous, OptionalAuth } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OptionalUserId } from '../../common/decorators';
import { IdParamsDto, SlugParamsDto } from '../community-core';
import {
  CreateTournamentDto,
  RegisterTournamentDto,
  ReportMatchDto,
  TournamentDto,
  TournamentPageDto,
  TournamentsQueryDto,
  WithdrawTournamentDto
} from './dto/tournaments.dto';
import { TournamentReaderService } from './services/tournament-reader.service';
import { TournamentWriterService } from './services/tournament-writer.service';

@ApiTags('community')
@Controller('community/tournaments')
export class TournamentsController {
  constructor(
    private readonly reader: TournamentReaderService,
    private readonly writer: TournamentWriterService
  ) {}

  @AllowAnonymous()
  @Get()
  @ZodResponse({ type: TournamentPageDto })
  list(@Query() query: TournamentsQueryDto) {
    return this.reader.list(query);
  }

  @OptionalAuth()
  @Get(':slug')
  @ZodResponse({ type: TournamentDto })
  get(@Param() { slug }: SlugParamsDto, @OptionalUserId() viewerUserId: string | null) {
    return this.reader.get({ slug, viewerUserId });
  }

  @Post()
  @ZodResponse({ type: TournamentDto, status: HttpStatus.CREATED })
  create(@CurrentUserId() userId: string, @Body() body: CreateTournamentDto) {
    return this.writer.create({ ...body, userId });
  }

  @Post(':id/open')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: TournamentDto })
  open(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    return this.writer.openRegistration({ id, userId });
  }

  @Post(':id/register')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: TournamentDto })
  register(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto, @Body() body: RegisterTournamentDto) {
    return this.writer.register({ ...body, id, userId });
  }

  @Post(':id/withdraw')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: TournamentDto })
  withdraw(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto, @Body() body: WithdrawTournamentDto) {
    return this.writer.withdraw({ ...body, id, userId });
  }

  @Post(':id/start')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: TournamentDto })
  start(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    return this.writer.start({ id, userId });
  }

  @Post(':id/matches')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: TournamentDto })
  report(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto, @Body() body: ReportMatchDto) {
    return this.writer.reportMatch({ ...body, id, userId });
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: TournamentDto })
  cancel(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    return this.writer.cancel({ id, userId });
  }
}
