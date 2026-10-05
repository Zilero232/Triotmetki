import { CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, HttpStatus, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ZodResponse } from 'nestjs-zod';

import { CACHE_TTL } from '../../common/cache';
import { ViewerCacheInterceptor } from '../../common/interceptors';
import { TankDetailReaderService, TankStatsReaderService, TierListReaderService } from '../tanks';
import { PublicApi } from './decorators';
import {
  V1TankDetailDto,
  V1TankDetailQueryDto,
  V1TankParamsDto,
  V1TankStatsPageDto,
  V1TankStatsQueryDto,
  V1TierListDto,
  V1TierListQueryDto
} from './dto';

@UseInterceptors(ViewerCacheInterceptor)
@PublicApi('tanks')
@Controller('v1/tanks')
export class V1TanksController {
  constructor(
    private readonly stats: TankStatsReaderService,
    private readonly tierLists: TierListReaderService,
    private readonly details: TankDetailReaderService
  ) {}

  @Get()
  @CacheTTL(CACHE_TTL.server)
  @ApiOperation({ operationId: 'listTankStats', summary: 'Server-wide statistics per tank: win rate, WR diff, damage, popularity' })
  @ZodResponse({ type: V1TankStatsPageDto, status: HttpStatus.OK })
  list(@Query() query: V1TankStatsQueryDto) {
    return this.stats.list(query);
  }

  @Get('tier-list')
  @CacheTTL(CACHE_TTL.server)
  @ApiOperation({ operationId: 'getTierList', summary: 'Tier list ranked by win-rate difference' })
  @ZodResponse({ type: V1TierListDto, status: HttpStatus.OK })
  tierList(@Query() query: V1TierListQueryDto) {
    return this.tierLists.tierList(query);
  }

  @Get(':id')
  @CacheTTL(CACHE_TTL.server)
  @ApiOperation({ operationId: 'getTank', summary: 'One tank: final stats, server stats, MoE and mastery thresholds, top players' })
  @ZodResponse({ type: V1TankDetailDto, status: HttpStatus.OK })
  detail(@Param() { id }: V1TankParamsDto, @Query() query: V1TankDetailQueryDto) {
    return this.details.detail({ idOrSlug: String(id), query });
  }
}
