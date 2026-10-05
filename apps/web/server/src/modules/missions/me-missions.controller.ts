import { Body, Controller, Get, Param, Put, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { RequiresPlus } from '../billing';
import {
  MissionGarageDto,
  MissionParamsDto,
  MissionPlanDto,
  MissionPlanQueryDto,
  MissionProgressDto,
  MissionProgressItemDto,
  UpdateMissionProgressDto
} from './dto/missions.dto';
import { MissionPlanReaderService } from './services/mission-plan-reader.service';
import { MissionProgressReaderService } from './services/mission-progress-reader.service';
import { MissionProgressWriterService } from './services/mission-progress-writer.service';
import { MissionTanksReaderService } from './services/mission-tanks-reader.service';

@ApiTags('me')
@Controller('me/missions')
export class MeMissionsController {
  constructor(
    private readonly progress: MissionProgressReaderService,
    private readonly progressWriter: MissionProgressWriterService,
    private readonly tanks: MissionTanksReaderService,
    private readonly plans: MissionPlanReaderService
  ) {}

  @Get('progress')
  @ZodResponse({ type: MissionProgressDto })
  listProgress(@CurrentUserId() userId: string) {
    return this.progress.list(userId);
  }

  @Put('progress')
  @ZodResponse({ type: MissionProgressItemDto })
  updateProgress(@CurrentUserId() userId: string, @Body() body: UpdateMissionProgressDto) {
    return this.progressWriter.update({ ...body, userId });
  }

  @Get('plan')
  @RequiresPlus('progression')
  @ZodResponse({ type: MissionPlanDto })
  plan(@CurrentUserId() userId: string, @Query() { operation }: MissionPlanQueryDto) {
    return this.plans.plan({ userId, operationId: operation });
  }

  @Get(':id/garage')
  @ZodResponse({ type: MissionGarageDto })
  garage(@CurrentUserId() userId: string, @Param() { id }: MissionParamsDto) {
    return this.tanks.garage({ userId, questId: id });
  }
}
