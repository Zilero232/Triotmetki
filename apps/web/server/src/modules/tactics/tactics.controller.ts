import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OptionalAuth } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId, OptionalUserId } from '../../common/decorators';
import { IdParamsDto } from '../community-core';
import { BoardTokenQueryDto, CreateTacticBoardDto, TacticBoardDto, TacticBoardListDto, UpdateTacticBoardDto } from './dto/tactics.dto';
import { TacticBoardWriterService } from './services/tactic-board-writer.service';

@ApiTags('tactics')
@Controller('tactics/boards')
export class TacticsController {
  constructor(private readonly boards: TacticBoardWriterService) {}

  @Get()
  @ZodResponse({ type: TacticBoardListDto })
  mine(@CurrentUserId() userId: string) {
    return this.boards.mine(userId);
  }

  @Post()
  @ZodResponse({ type: TacticBoardDto, status: HttpStatus.CREATED })
  create(@CurrentUserId() userId: string, @Body() body: CreateTacticBoardDto) {
    return this.boards.create({ ...body, userId });
  }

  @OptionalAuth()
  @Get(':id')
  @ZodResponse({ type: TacticBoardDto })
  open(@Param() { id }: IdParamsDto, @Query() { token }: BoardTokenQueryDto, @OptionalUserId() userId: string | null) {
    return this.boards.open({ id, userId, token: token ?? null });
  }

  @OptionalAuth()
  @Patch(':id')
  @ZodResponse({ type: TacticBoardDto })
  update(
    @Param() { id }: IdParamsDto,
    @Query() { token }: BoardTokenQueryDto,
    @OptionalUserId() userId: string | null,
    @Body() body: UpdateTacticBoardDto
  ) {
    return this.boards.update({ ...body, id, userId, token: token ?? null });
  }

  @Post(':id/tokens')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: TacticBoardDto })
  rotate(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    return this.boards.rotateTokens({ id, userId });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto) {
    await this.boards.remove({ id, userId });
  }
}
