import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, HttpStatus, Param, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { ModMoeParamsDto, ModMoeThresholdsDto } from './dto/marks.dto';
import { ModThresholdsReaderService } from './services/mod-thresholds-reader.service';

@ApiTags('v1-mod')
@AllowAnonymous()
@UseInterceptors(ViewerCacheInterceptor)
@Controller('v1/moe')
export class MoePublicController {
  constructor(private readonly modThresholds: ModThresholdsReaderService) {}

  @Get(':tankId')
  @CacheTTL(CACHE_TTL.reference)
  @ApiOperation({
    operationId: 'getModMarkThresholds',
    summary: 'MoE thresholds in the shape the game mod reads; no API key needed. `is_enough` is false while the thresholds are unknown'
  })
  @ZodResponse({ type: ModMoeThresholdsDto, status: HttpStatus.OK })
  thresholds(@Param() { tankId }: ModMoeParamsDto) {
    return this.modThresholds.forTank(tankId);
  }
}
