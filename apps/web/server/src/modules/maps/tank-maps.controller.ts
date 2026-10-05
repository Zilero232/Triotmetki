import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { TankMapParamsDto, TankMapsDto } from './dto/maps.dto';
import { TankMapStatsReaderService } from './services/tank-map-stats-reader.service';

@ApiTags('maps')
@AllowAnonymous()
@UseInterceptors(ViewerCacheInterceptor)
@Controller('tanks')
export class TankMapsController {
  constructor(private readonly stats: TankMapStatsReaderService) {}

  @Get(':id/maps')
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: TankMapsDto })
  maps(@Param() { id }: TankMapParamsDto) {
    return this.stats.forTank(id);
  }
}
