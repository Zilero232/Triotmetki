import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { MapDetailDto, MapListDto, MapParamsDto, MapsQueryDto, MapTanksDto } from './dto/maps.dto';
import { MapsReaderService } from './services/maps-reader.service';
import { TankMapStatsReaderService } from './services/tank-map-stats-reader.service';

@ApiTags('maps')
@AllowAnonymous()
@UseInterceptors(ViewerCacheInterceptor)
@Controller('maps')
export class MapsController {
  constructor(
    private readonly maps: MapsReaderService,
    private readonly tankStats: TankMapStatsReaderService
  ) {}

  @Get()
  @CacheTTL(CACHE_TTL.reference)
  @ZodResponse({ type: MapListDto })
  list(@Query() query: MapsQueryDto) {
    return this.maps.list(query);
  }

  @Get(':idOrSlug/tanks')
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: MapTanksDto })
  tanks(@Param() { idOrSlug }: MapParamsDto) {
    return this.tankStats.forMap(idOrSlug);
  }

  @Get(':idOrSlug')
  @CacheTTL(CACHE_TTL.server)
  @ZodResponse({ type: MapDetailDto })
  detail(@Param() { idOrSlug }: MapParamsDto) {
    return this.maps.detail(idOrSlug);
  }
}
