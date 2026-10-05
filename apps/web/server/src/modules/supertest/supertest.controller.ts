import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { RequiresPlus } from '../billing';
import { SupertestAnnouncementDto, SupertestListDto, SupertestMineDto, SupertestParamsDto } from './dto/supertest.dto';
import { SupertestReaderService } from './services/supertest-reader.service';

@ApiTags('supertest')
@Controller('supertest')
export class SupertestController {
  constructor(private readonly supertest: SupertestReaderService) {}

  @Get()
  @AllowAnonymous()
  @ZodResponse({ type: SupertestListDto })
  list() {
    return this.supertest.list();
  }

  @Get('mine')
  @RequiresPlus('supertest')
  @ZodResponse({ type: SupertestMineDto })
  mine(@CurrentUserId() userId: string) {
    return this.supertest.mine(userId);
  }

  @Get(':id')
  @AllowAnonymous()
  @ZodResponse({ type: SupertestAnnouncementDto })
  detail(@Param() { id }: SupertestParamsDto) {
    return this.supertest.detail(id);
  }
}
