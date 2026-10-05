import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { IdParamsDto } from '../community-core';
import { MODERATION } from './config/moderation.constants';
import {
  ContentReportDto,
  ContentReportListDto,
  CreateReportDto,
  ModerateDto,
  ModerationTargetParamsDto,
  PendingGuidesDto,
  ReportsQueryDto,
  ResolveReportDto
} from './dto/moderation.dto';
import { ModerationWriterService } from './services/moderation-writer.service';

@ApiTags('community')
@Controller()
export class ModerationController {
  constructor(private readonly moderation: ModerationWriterService) {}

  @Post('community/reports')
  @Throttle({ default: MODERATION.reportThrottle })
  @ZodResponse({ type: ContentReportDto, status: HttpStatus.CREATED })
  report(@CurrentUserId() userId: string, @Body() body: CreateReportDto) {
    return this.moderation.report({ ...body, userId });
  }

  @Roles([...MODERATION.roles])
  @Get('admin/moderation/reports')
  @ZodResponse({ type: ContentReportListDto })
  reports(@Query() { status }: ReportsQueryDto) {
    return this.moderation.reports(status);
  }

  @Roles([...MODERATION.roles])
  @Post('admin/moderation/reports/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: ContentReportDto })
  resolve(@CurrentUserId() userId: string, @Param() { id }: IdParamsDto, @Body() body: ResolveReportDto) {
    return this.moderation.resolve({ ...body, id, userId });
  }

  @Roles([...MODERATION.roles])
  @Get('admin/moderation/guides')
  @ZodResponse({ type: PendingGuidesDto })
  pendingGuides() {
    return this.moderation.pendingGuides();
  }

  @Roles([...MODERATION.roles])
  @Post('admin/moderation/:target/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async moderate(@Param() { target, id }: ModerationTargetParamsDto, @Body() { status }: ModerateDto) {
    await this.moderation.moderate({ target, id, status });
  }
}
