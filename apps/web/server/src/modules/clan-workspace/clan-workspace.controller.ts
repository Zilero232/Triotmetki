import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import {
  CandidateDto,
  CandidateListDto,
  CandidatesQueryDto,
  ClanEventDto,
  ClanEventListDto,
  ClanEventParamsDto,
  ClanEventsQueryDto,
  ClanParamsDto,
  CreateCandidateDto,
  CreateClanEventDto,
  RsvpDto,
  SetAttendanceDto,
  UpdateCandidateDto,
  UpdateClanEventDto,
  WeeklyReportDto,
  WorkspaceDto
} from './dto/clan-workspace.dto';
import { EVENT_KIND_TO_DB } from './lib/clan-event/clan-event.constants';
import { ClanEventAttendanceWriterService } from './services/clan-event-attendance-writer.service';
import { ClanEventsWriterService } from './services/clan-events-writer.service';
import { OfficerReportService } from './services/officer-report.service';
import { RecruitFunnelWriterService } from './services/recruit-funnel-writer.service';
import { WorkspaceWriterService } from './services/workspace-writer.service';

@ApiTags('clan-workspace')
@Controller('clan-workspace/:clanId')
export class ClanWorkspaceController {
  constructor(
    private readonly workspaces: WorkspaceWriterService,
    private readonly events: ClanEventsWriterService,
    private readonly attendance: ClanEventAttendanceWriterService,
    private readonly funnel: RecruitFunnelWriterService,
    private readonly reports: OfficerReportService
  ) {}

  @Post()
  @ZodResponse({ type: WorkspaceDto, status: HttpStatus.CREATED })
  create(@CurrentUserId() userId: string, @Param() { clanId }: ClanParamsDto) {
    return this.workspaces.create({ clanId, userId });
  }

  @Get()
  @ZodResponse({ type: WorkspaceDto })
  get(@CurrentUserId() userId: string, @Param() { clanId }: ClanParamsDto) {
    return this.workspaces.get({ clanId, userId });
  }

  @Get('events')
  @ZodResponse({ type: ClanEventListDto })
  listEvents(@CurrentUserId() userId: string, @Param() { clanId }: ClanParamsDto, @Query() query: ClanEventsQueryDto) {
    return this.events.list({ ...query, clanId, userId });
  }

  @Post('events')
  @ZodResponse({ type: ClanEventDto, status: HttpStatus.CREATED })
  createEvent(@CurrentUserId() userId: string, @Param() { clanId }: ClanParamsDto, @Body() { kind, ...body }: CreateClanEventDto) {
    return this.events.create({ ...body, kind: EVENT_KIND_TO_DB[kind], clanId, userId });
  }

  @Patch('events/:id')
  @ZodResponse({ type: ClanEventDto })
  updateEvent(@CurrentUserId() userId: string, @Param() { clanId, id }: ClanEventParamsDto, @Body() { kind, ...body }: UpdateClanEventDto) {
    return this.events.update({ ...body, ...(kind ? { kind: EVENT_KIND_TO_DB[kind] } : {}), clanId, userId, id });
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEvent(@CurrentUserId() userId: string, @Param() { clanId, id }: ClanEventParamsDto) {
    await this.events.remove({ clanId, userId, id });
  }

  @Put('events/:id/attendance')
  @ZodResponse({ type: ClanEventDto })
  setAttendance(@CurrentUserId() userId: string, @Param() { clanId, id }: ClanEventParamsDto, @Body() { entries }: SetAttendanceDto) {
    return this.attendance.setAttendance({ clanId, userId, id, entries });
  }

  @Post('events/:id/attendance/sync')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: ClanEventDto })
  syncAttendance(@CurrentUserId() userId: string, @Param() { clanId, id }: ClanEventParamsDto) {
    return this.attendance.syncFromApi({ clanId, userId, id });
  }

  @Post('events/:id/rsvp')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({ type: ClanEventDto })
  rsvp(@CurrentUserId() userId: string, @Param() { clanId, id }: ClanEventParamsDto, @Body() { status }: RsvpDto) {
    return this.attendance.rsvp({ clanId, userId, id, status });
  }

  @Get('candidates')
  @ZodResponse({ type: CandidateListDto })
  candidates(@CurrentUserId() userId: string, @Param() { clanId }: ClanParamsDto, @Query() { status }: CandidatesQueryDto) {
    return this.funnel.list({ clanId, userId, status });
  }

  @Post('candidates')
  @ZodResponse({ type: CandidateDto, status: HttpStatus.CREATED })
  addCandidate(@CurrentUserId() userId: string, @Param() { clanId }: ClanParamsDto, @Body() body: CreateCandidateDto) {
    return this.funnel.add({ ...body, clanId, userId });
  }

  @Patch('candidates/:id')
  @ZodResponse({ type: CandidateDto })
  updateCandidate(@CurrentUserId() userId: string, @Param() { clanId, id }: ClanEventParamsDto, @Body() body: UpdateCandidateDto) {
    return this.funnel.update({ ...body, clanId, userId, id });
  }

  @Delete('candidates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCandidate(@CurrentUserId() userId: string, @Param() { clanId, id }: ClanEventParamsDto) {
    await this.funnel.remove({ clanId, userId, id });
  }

  @Get('report')
  @ZodResponse({ type: WeeklyReportDto })
  report(@CurrentUserId() userId: string, @Param() { clanId }: ClanParamsDto) {
    return this.reports.forOfficer({ clanId, userId });
  }
}
