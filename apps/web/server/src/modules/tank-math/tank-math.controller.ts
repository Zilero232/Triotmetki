import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { TankDetailReaderService } from '../tanks';
import { TankMathDto, TankMathParamsDto } from './dto/tank-math.dto';
import { TankMathReaderService } from './services/tank-math-reader.service';

@ApiTags('tank-math')
@AllowAnonymous()
@Controller('tank-math')
export class TankMathController {
  constructor(
    private readonly tanks: TankDetailReaderService,
    private readonly math: TankMathReaderService
  ) {}

  @Get(':tankId')
  @UseInterceptors(ViewerCacheInterceptor)
  @CacheTTL(CACHE_TTL.reference)
  @ZodResponse({ type: TankMathDto })
  async get(@Param() { tankId }: TankMathParamsDto) {
    return this.math.inputs(await this.tanks.resolve(String(tankId)));
  }
}
