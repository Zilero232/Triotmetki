import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CurrentUserId } from '../../common/decorators';
import { HonestRngDto, HonestRngMineDto, RngQueryDto } from './dto/honest-rng.dto';
import { HonestRngReaderService } from './services/honest-rng-reader.service';

@ApiTags('honest-rng')
@Controller('honest-rng')
export class HonestRngController {
  constructor(private readonly rng: HonestRngReaderService) {}

  @Get()
  @AllowAnonymous()
  @ZodResponse({ type: HonestRngDto })
  view(@Query() { period }: RngQueryDto) {
    return this.rng.view(period);
  }

  @Get('me')
  @ZodResponse({ type: HonestRngMineDto })
  mine(@CurrentUserId() userId: string, @Query() { period }: RngQueryDto) {
    return this.rng.mine({ userId, period });
  }
}
