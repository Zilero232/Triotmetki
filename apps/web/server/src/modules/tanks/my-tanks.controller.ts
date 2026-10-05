import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { RequiresPlus } from '../billing';
import { AccountEconomyDto, AccountEconomyQueryDto, MyTankLearningDto, TankParamsDto } from './dto/tanks.dto';
import { MyTankInsightsReaderService } from './services/my-tank-insights-reader.service';
import { TankDetailReaderService } from './services/tank-detail-reader.service';

@ApiTags('tanks')
@Controller('tanks')
export class MyTanksController {
  constructor(
    private readonly insights: MyTankInsightsReaderService,
    private readonly details: TankDetailReaderService
  ) {}

  @Get('economy/me')
  @RequiresPlus('analytics')
  @ZodResponse({ type: AccountEconomyDto })
  economy(@CurrentUserId() userId: string, @Query() query: AccountEconomyQueryDto) {
    return this.insights.economyOf({ userId, query });
  }

  @Get(':id/learning-curve/me')
  @RequiresPlus('analytics')
  @ZodResponse({ type: MyTankLearningDto })
  async learning(@CurrentUserId() userId: string, @Param() { id }: TankParamsDto) {
    return this.insights.learningOf({ userId, tankId: await this.details.resolve(String(id)) });
  }
}
